import { formatGrapeVarieties } from '@/lib/grape-varieties'
import { isUnmatchedImportStatus } from '@/lib/store-listing-match-suggestions'
import type { StoreListingImportRecord, StoreListingRecord } from '@/lib/store-listings'
import { formatWineLabel, type WineRecord } from '@/lib/wines'
import { scoreWineMatch } from '@/lib/wine-match-suggestions'

export type ImportCompareField =
  | 'producer'
  | 'raw_title'
  | 'current_price_ksh'
  | 'store_product_url'
  | 'vintage'
  | 'country'
  | 'region'
  | 'style'
  | 'grape_varieties'

const IMPORT_COMPARE_FIELDS: ImportCompareField[] = [
  'producer',
  'raw_title',
  'current_price_ksh',
  'store_product_url',
  'vintage',
  'country',
  'region',
  'style',
  'grape_varieties',
]

/** Minimum wine↔listing/import score to treat as a heuristic remnant match. */
const HEURISTIC_MATCH_THRESHOLD = 40
const CANDIDATE_LIMIT = 5

export type OrphanBreakdownKind =
  | 'blank_add_wine'
  | 'listing_deleted'
  | 'link_cleared_or_promote_failed'
  | 'rematched_away'
  | 'unlinked_shop_match'
  | 'import_only_remnant'
  | 'unknown'

export const ORPHAN_BREAKDOWN_LABELS: Record<OrphanBreakdownKind, string> = {
  blank_add_wine: 'Blank Add wine',
  listing_deleted: 'Listing deleted',
  link_cleared_or_promote_failed: 'Link cleared / promote-link failed',
  rematched_away: 'Rematched away',
  unlinked_shop_match: 'Unlinked shop match',
  import_only_remnant: 'Import-only remnant',
  unknown: 'Unknown',
}

export type PipelineFunnel = {
  importsTotal: number
  importsUnmatched: number
  importsMatched: number
  importsDone: number
  importsWithoutListingLink: number
  listingsTotal: number
  listingsUnlinked: number
  listingsLinked: number
  winesTotal: number
  winesWithListings: number
  winesOrphan: number
  winesVerified: number
  winesOnSite: number
}

export type FieldDriftRow = {
  importRow: StoreListingImportRecord
  listing: StoreListingRecord
  diffFields: ImportCompareField[]
}

export type RelinkCandidate = {
  kind: 'listing' | 'import'
  id: string
  title: string | null
  storeName: string | null
  score: number
}

export type OrphanWineRow = {
  wine: WineRecord
  breakdown: OrphanBreakdownKind
  evidence: string
  candidates: RelinkCandidate[]
}

export type PipelineExceptionQueues = {
  stuckImports: StoreListingImportRecord[]
  doneButUnlinked: StoreListingImportRecord[]
  brokenImportLinks: StoreListingImportRecord[]
  unmatchedListings: StoreListingRecord[]
  orphanWines: OrphanWineRow[]
  fieldDrift: FieldDriftRow[]
}

export type PipelineChainListingStatus =
  | 'ok'
  | 'missing'
  | 'unlinked'
  | 'other_wine'
  | 'none'

export type PipelineChain = {
  importRow: StoreListingImportRecord | null
  listing: StoreListingRecord | null
  listingStatus: PipelineChainListingStatus
  wine: WineRecord | null
  orphan: OrphanWineRow | null
  relatedImports: StoreListingImportRecord[]
}

export type PipelineLineage = {
  funnel: PipelineFunnel
  queues: PipelineExceptionQueues
  importsById: Map<string, StoreListingImportRecord>
  listingsById: Map<string, StoreListingRecord>
  winesById: Map<string, WineRecord>
  listingIdsByWineId: Map<string, string[]>
  importsByListingId: Map<string, StoreListingImportRecord[]>
}

function normalizeStatus(status: string | null | undefined): string {
  return status?.trim().toLowerCase() ?? ''
}

function isBlankText(value: string | null | undefined): boolean {
  return !value || !String(value).trim()
}

function normalizeFieldForCompare(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizePriceForCompare(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? String(n) : normalizeFieldForCompare(value)
}

export function importFieldDiffers(
  importRow: StoreListingImportRecord,
  storeListing: StoreListingRecord,
  field: ImportCompareField,
): boolean {
  if (field === 'grape_varieties') {
    return (
      normalizeFieldForCompare(formatGrapeVarieties(importRow.grape_varieties)) !==
      normalizeFieldForCompare(formatGrapeVarieties(storeListing.grape_varieties))
    )
  }
  if (field === 'current_price_ksh') {
    return (
      normalizePriceForCompare(importRow.current_price_ksh) !==
      normalizePriceForCompare(storeListing.current_price_ksh)
    )
  }
  return (
    normalizeFieldForCompare(importRow[field]) !== normalizeFieldForCompare(storeListing[field])
  )
}

export function getImportFieldDiffs(
  importRow: StoreListingImportRecord,
  storeListing: StoreListingRecord | null,
): ImportCompareField[] {
  if (!storeListing) return []
  return IMPORT_COMPARE_FIELDS.filter((field) => importFieldDiffers(importRow, storeListing, field))
}

function isPerfectVivinoMatch(wine: WineRecord): boolean {
  return wine.vivino_match_confidence === 100
}

function storeNameOf(
  row: { stores?: { name?: string | null } | null } | null | undefined,
): string | null {
  const name = row?.stores?.name?.trim()
  return name || null
}

function scoreAgainstWine(
  wine: Pick<WineRecord, 'producer' | 'wine_name'>,
  row: Pick<StoreListingRecord, 'producer' | 'raw_title'>,
): number {
  return scoreWineMatch(row, wine)
}

export function findRelinkCandidates(
  wine: WineRecord,
  unmatchedListings: StoreListingRecord[],
  imports: StoreListingImportRecord[],
  limit = CANDIDATE_LIMIT,
): RelinkCandidate[] {
  const listingCandidates = unmatchedListings
    .map((listing) => ({
      kind: 'listing' as const,
      id: listing.id,
      title: listing.raw_title,
      storeName: storeNameOf(listing),
      score: scoreAgainstWine(wine, listing),
    }))
    .filter((row) => row.score > 0)

  const importCandidates = imports
    .map((importRow) => ({
      kind: 'import' as const,
      id: importRow.id,
      title: importRow.raw_title,
      storeName: storeNameOf(importRow),
      score: scoreAgainstWine(wine, importRow),
    }))
    .filter((row) => row.score > 0)

  return [...listingCandidates, ...importCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function classifyOrphanWine(
  wine: WineRecord,
  listingsById: Map<string, StoreListingRecord>,
  unmatchedListings: StoreListingRecord[],
  imports: StoreListingImportRecord[],
): Omit<OrphanWineRow, 'wine'> {
  const candidates = findRelinkCandidates(wine, unmatchedListings, imports)

  if (isBlankText(wine.producer) && isBlankText(wine.wine_name)) {
    return {
      breakdown: 'blank_add_wine',
      evidence: 'Empty producer and wine name — likely blank Add wine.',
      candidates,
    }
  }

  const sourceId = wine.image_source_listing_id?.trim() || null
  if (sourceId) {
    const sourceListing = listingsById.get(sourceId)
    if (!sourceListing) {
      return {
        breakdown: 'listing_deleted',
        evidence: `image_source_listing_id ${sourceId.slice(0, 8)}… points at a missing listing.`,
        candidates,
      }
    }

    if (!sourceListing.wine_id) {
      const sourceCandidate: RelinkCandidate = {
        kind: 'listing',
        id: sourceListing.id,
        title: sourceListing.raw_title,
        storeName: storeNameOf(sourceListing),
        score: scoreAgainstWine(wine, sourceListing),
      }
      return {
        breakdown: 'link_cleared_or_promote_failed',
        evidence: `Source listing “${sourceListing.raw_title ?? '(untitled)'}” exists but wine_id is null.`,
        candidates: [
          sourceCandidate,
          ...candidates.filter((c) => !(c.kind === 'listing' && c.id === sourceListing.id)),
        ].slice(0, CANDIDATE_LIMIT),
      }
    }

    if (sourceListing.wine_id !== wine.id) {
      const otherLabel = sourceListing.wines
        ? formatWineLabel(sourceListing.wines)
        : sourceListing.wine_id.slice(0, 8)
      const sourceCandidate: RelinkCandidate = {
        kind: 'listing',
        id: sourceListing.id,
        title: sourceListing.raw_title,
        storeName: storeNameOf(sourceListing),
        score: scoreAgainstWine(wine, sourceListing),
      }
      return {
        breakdown: 'rematched_away',
        evidence: `Source listing “${sourceListing.raw_title ?? '(untitled)'}” now links to ${otherLabel}.`,
        candidates: [
          sourceCandidate,
          ...candidates.filter((c) => !(c.kind === 'listing' && c.id === sourceListing.id)),
        ].slice(0, CANDIDATE_LIMIT),
      }
    }
  }

  const bestListing = candidates.find((c) => c.kind === 'listing')
  if (bestListing && bestListing.score >= HEURISTIC_MATCH_THRESHOLD) {
    return {
      breakdown: 'unlinked_shop_match',
      evidence: `Title ≈ unmatched listing “${bestListing.title ?? '(untitled)'}” (score ${bestListing.score}).`,
      candidates,
    }
  }

  const bestImport = candidates.find((c) => c.kind === 'import')
  if (bestImport && bestImport.score >= HEURISTIC_MATCH_THRESHOLD) {
    return {
      breakdown: 'import_only_remnant',
      evidence: `Title ≈ import “${bestImport.title ?? '(untitled)'}” (score ${bestImport.score}); no living listing match.`,
      candidates,
    }
  }

  return {
    breakdown: 'unknown',
    evidence: 'No image provenance or strong title match to unmatched listings/imports.',
    candidates,
  }
}

export function buildPipelineLineage(
  imports: StoreListingImportRecord[],
  listings: StoreListingRecord[],
  wines: WineRecord[],
): PipelineLineage {
  const importsById = new Map(imports.map((importRow) => [importRow.id, importRow]))
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]))
  const winesById = new Map(wines.map((wine) => [wine.id, wine]))

  const listingIdsByWineId = new Map<string, string[]>()
  for (const listing of listings) {
    if (!listing.wine_id) continue
    const existing = listingIdsByWineId.get(listing.wine_id)
    if (existing) existing.push(listing.id)
    else listingIdsByWineId.set(listing.wine_id, [listing.id])
  }

  const importsByListingId = new Map<string, StoreListingImportRecord[]>()
  for (const importRow of imports) {
    const listingId = importRow.matched_store_listing_id
    if (!listingId) continue
    const existing = importsByListingId.get(listingId)
    if (existing) existing.push(importRow)
    else importsByListingId.set(listingId, [importRow])
  }

  const unmatchedListings = listings.filter((listing) => !listing.wine_id)

  let importsUnmatched = 0
  let importsMatched = 0
  let importsDone = 0
  let importsWithoutListingLink = 0
  const stuckImports: StoreListingImportRecord[] = []
  const doneButUnlinked: StoreListingImportRecord[] = []
  const brokenImportLinks: StoreListingImportRecord[] = []
  const fieldDrift: FieldDriftRow[] = []

  for (const importRow of imports) {
    const status = normalizeStatus(importRow.status)
    const linkedId = importRow.matched_store_listing_id

    if (isUnmatchedImportStatus(importRow.status) || (!linkedId && status !== 'matched' && status !== 'done')) {
      importsUnmatched += 1
    }
    if (status === 'matched' || Boolean(linkedId)) importsMatched += 1
    if (status === 'done') importsDone += 1
    if (!linkedId) importsWithoutListingLink += 1

    if (!linkedId && status === 'done') {
      doneButUnlinked.push(importRow)
    } else if (!linkedId) {
      stuckImports.push(importRow)
    } else if (!listingsById.has(linkedId)) {
      brokenImportLinks.push(importRow)
    } else {
      const listing = listingsById.get(linkedId)!
      const diffFields = getImportFieldDiffs(importRow, listing)
      if (diffFields.length > 0) {
        fieldDrift.push({ importRow, listing, diffFields })
      }
    }
  }

  const listingsUnlinked = unmatchedListings.length
  const listingsLinked = listings.length - listingsUnlinked

  let winesVerified = 0
  let winesOnSite = 0
  const orphanWines: OrphanWineRow[] = []

  for (const wine of wines) {
    if (isPerfectVivinoMatch(wine)) winesVerified += 1
    if (wine.show_on_site) winesOnSite += 1

    const linked = listingIdsByWineId.get(wine.id)
    if (!linked || linked.length === 0) {
      orphanWines.push({
        wine,
        ...classifyOrphanWine(wine, listingsById, unmatchedListings, imports),
      })
    }
  }

  orphanWines.sort((a, b) => {
    if (a.breakdown !== b.breakdown) return a.breakdown.localeCompare(b.breakdown)
    return formatWineLabel(a.wine).localeCompare(formatWineLabel(b.wine))
  })

  const funnel: PipelineFunnel = {
    importsTotal: imports.length,
    importsUnmatched,
    importsMatched,
    importsDone,
    importsWithoutListingLink,
    listingsTotal: listings.length,
    listingsUnlinked,
    listingsLinked,
    winesTotal: wines.length,
    winesWithListings: wines.length - orphanWines.length,
    winesOrphan: orphanWines.length,
    winesVerified,
    winesOnSite,
  }

  return {
    funnel,
    queues: {
      stuckImports,
      doneButUnlinked,
      brokenImportLinks,
      unmatchedListings,
      orphanWines,
      fieldDrift,
    },
    importsById,
    listingsById,
    winesById,
    listingIdsByWineId,
    importsByListingId,
  }
}

export function resolvePipelineChain(
  lineage: PipelineLineage,
  focus: { importId?: string | null; listingId?: string | null; wineId?: string | null },
): PipelineChain | null {
  const {
    importsById,
    importsByListingId,
    listingsById,
    winesById,
    listingIdsByWineId,
    queues,
  } = lineage

  let importRow: StoreListingImportRecord | null = null
  let listing: StoreListingRecord | null = null
  let wine: WineRecord | null = null

  if (focus.importId) {
    importRow = importsById.get(focus.importId) ?? null
  }

  if (focus.listingId) {
    listing = listingsById.get(focus.listingId) ?? null
  } else if (importRow?.matched_store_listing_id) {
    listing = listingsById.get(importRow.matched_store_listing_id) ?? null
  }

  if (focus.wineId) {
    wine = winesById.get(focus.wineId) ?? null
  } else if (listing?.wine_id) {
    wine = winesById.get(listing.wine_id) ?? null
  }

  // If focusing a wine with no listing yet, attach first related listing if any
  if (wine && !listing) {
    const listingIds = listingIdsByWineId.get(wine.id)
    if (listingIds?.[0]) listing = listingsById.get(listingIds[0]) ?? null
  }

  if (!importRow && listing) {
    importRow = importsByListingId.get(listing.id)?.[0] ?? null
  }

  let listingStatus: PipelineChainListingStatus = 'none'
  if (importRow?.matched_store_listing_id && !listing) {
    listingStatus = 'missing'
  } else if (listing) {
    if (!listing.wine_id) listingStatus = 'unlinked'
    else if (wine && listing.wine_id !== wine.id) listingStatus = 'other_wine'
    else listingStatus = 'ok'
  } else if (wine) {
    listingStatus = 'none'
  }

  const orphan =
    wine && (!listingIdsByWineId.get(wine.id) || listingIdsByWineId.get(wine.id)!.length === 0)
      ? (queues.orphanWines.find((row) => row.wine.id === wine!.id) ?? null)
      : null

  const relatedImports = listing
    ? (importsByListingId.get(listing.id) ?? [])
    : importRow
      ? [importRow]
      : []

  if (!importRow && !listing && !wine) return null

  return {
    importRow,
    listing,
    listingStatus,
    wine,
    orphan,
    relatedImports,
  }
}

/** Serializable snapshot for passing from server → client (Maps flattened). */
export type PipelineLineageSnapshot = {
  funnel: PipelineFunnel
  queues: PipelineExceptionQueues
  listings: StoreListingRecord[]
  wines: WineRecord[]
  imports: StoreListingImportRecord[]
}

export function toPipelineLineageSnapshot(
  imports: StoreListingImportRecord[],
  listings: StoreListingRecord[],
  wines: WineRecord[],
): PipelineLineageSnapshot {
  const lineage = buildPipelineLineage(imports, listings, wines)
  return {
    funnel: lineage.funnel,
    queues: lineage.queues,
    listings,
    wines,
    imports,
  }
}

export function lineageFromSnapshot(snapshot: PipelineLineageSnapshot): PipelineLineage {
  return buildPipelineLineage(snapshot.imports, snapshot.listings, snapshot.wines)
}
