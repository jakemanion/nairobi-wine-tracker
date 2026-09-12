import type { StoreListingImportRecord, StoreListingRecord } from '@/lib/store-listings'

function normalizeMatchText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function parsePriceNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export function scoreStoreListingMatch(
  importRow: Pick<StoreListingImportRecord, 'producer' | 'raw_title' | 'current_price_ksh'>,
  listing: Pick<StoreListingRecord, 'producer' | 'raw_title' | 'current_price_ksh'>,
): number {
  const importTitle = normalizeMatchText(importRow.raw_title)
  const listingTitle = normalizeMatchText(listing.raw_title)
  const importProducer = normalizeMatchText(importRow.producer)
  const listingProducer = normalizeMatchText(listing.producer)

  if (!importTitle && !listingTitle && importRow.current_price_ksh == null) {
    return 0
  }

  let score = 0

  if (importTitle && listingTitle) {
    if (importTitle === listingTitle) score += 50
    else if (importTitle.includes(listingTitle) || listingTitle.includes(importTitle)) {
      score += 30
    }
  }

  if (importProducer && listingProducer) {
    if (importProducer === listingProducer) score += 20
    else if (
      importProducer.includes(listingProducer) ||
      listingProducer.includes(importProducer)
    ) {
      score += 10
    }
  }

  if (importTitle && listingProducer && importTitle.includes(listingProducer)) score += 10
  if (listingTitle && importProducer && listingTitle.includes(importProducer)) score += 10

  const importPrice = parsePriceNumber(importRow.current_price_ksh)
  const listingPrice = parsePriceNumber(listing.current_price_ksh)
  if (importPrice != null && listingPrice != null) {
    if (importPrice === listingPrice) {
      score += 40
    } else {
      const diff = Math.abs(importPrice - listingPrice)
      const avg = (importPrice + listingPrice) / 2
      const pct = avg === 0 ? 1 : diff / avg
      if (pct <= 0.02) score += 30
      else if (pct <= 0.05) score += 20
      else if (pct <= 0.1) score += 10
      else if (diff <= 200) score += 5
    }
  }

  return score
}

function importStoreId(importRow: StoreListingImportRecord): string | null {
  return importRow.store_id ?? importRow.stores?.id ?? null
}

function listingStoreId(listing: StoreListingRecord): string | null {
  return listing.store_id ?? listing.stores?.id ?? null
}

export type StoreListingMatchHighlightField =
  | 'producer'
  | 'raw_title'
  | 'current_price_ksh'
  | 'vintage'
  | 'store_product_url'

function isGoodTextMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function normalizeUrlForMatch(value: string | null | undefined): string {
  const raw = (value ?? '').trim().toLowerCase()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.origin}${path}${url.search}`
  } catch {
    return raw.replace(/\/+$/, '')
  }
}

function isGoodUrlMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const urlA = normalizeUrlForMatch(a)
  const urlB = normalizeUrlForMatch(b)
  if (!urlA || !urlB) return false
  return urlA === urlB || urlA.includes(urlB) || urlB.includes(urlA)
}

function isGoodPriceMatch(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  const priceA = parsePriceNumber(a)
  const priceB = parsePriceNumber(b)
  if (priceA == null || priceB == null) return false
  if (priceA === priceB) return true
  const diff = Math.abs(priceA - priceB)
  const avg = (priceA + priceB) / 2
  const pct = avg === 0 ? 1 : diff / avg
  return pct <= 0.05
}

function isGoodVintageMatch(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  const vintageA = normalizeMatchText(a == null ? null : String(a))
  const vintageB = normalizeMatchText(b == null ? null : String(b))
  return Boolean(vintageA && vintageB && vintageA === vintageB)
}

/** Fields that are a strong match between an import and a candidate store listing. */
export function getStoreListingMatchHighlights(
  importRow: Pick<
    StoreListingImportRecord,
    'producer' | 'raw_title' | 'current_price_ksh' | 'vintage' | 'store_product_url'
  >,
  listing: Pick<
    StoreListingRecord,
    'producer' | 'raw_title' | 'current_price_ksh' | 'vintage' | 'store_product_url'
  >,
): Set<StoreListingMatchHighlightField> {
  const highlights = new Set<StoreListingMatchHighlightField>()

  if (
    isGoodTextMatch(normalizeMatchText(importRow.raw_title), normalizeMatchText(listing.raw_title))
  ) {
    highlights.add('raw_title')
  }

  if (
    isGoodTextMatch(normalizeMatchText(importRow.producer), normalizeMatchText(listing.producer))
  ) {
    highlights.add('producer')
  }

  if (isGoodPriceMatch(importRow.current_price_ksh, listing.current_price_ksh)) {
    highlights.add('current_price_ksh')
  }

  if (isGoodVintageMatch(importRow.vintage, listing.vintage)) {
    highlights.add('vintage')
  }

  if (isGoodUrlMatch(importRow.store_product_url, listing.store_product_url)) {
    highlights.add('store_product_url')
  }

  return highlights
}

function isExactTitleMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const titleA = normalizeMatchText(a)
  const titleB = normalizeMatchText(b)
  return Boolean(titleA && titleB && titleA === titleB)
}

function isExactPriceMatch(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  const priceA = parsePriceNumber(a)
  const priceB = parsePriceNumber(b)
  return priceA != null && priceB != null && priceA === priceB
}

function isExactUrlMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const urlA = normalizeUrlForMatch(a)
  const urlB = normalizeUrlForMatch(b)
  return Boolean(urlA && urlB && urlA === urlB)
}

export function isUnmatchedImportStatus(status: string | null | undefined): boolean {
  return status?.trim().toLowerCase() === 'unmatched'
}

/** True when a suggested same-store listing matches title, price, and URL exactly. */
export function hasPerfectSuggestedStoreListingMatch(
  importRow: StoreListingImportRecord,
  listings: StoreListingRecord[],
  limit = 4,
): boolean {
  const suggestions = suggestStoreListingMatches(importRow, listings, limit)
  return suggestions.some(
    (listing) =>
      isExactTitleMatch(importRow.raw_title, listing.raw_title) &&
      isExactPriceMatch(importRow.current_price_ksh, listing.current_price_ksh) &&
      isExactUrlMatch(importRow.store_product_url, listing.store_product_url),
  )
}

export function suggestStoreListingMatches(
  importRow: StoreListingImportRecord,
  listings: StoreListingRecord[],
  limit = 4,
): StoreListingRecord[] {
  const storeId = importStoreId(importRow)
  if (!storeId) return []

  return listings
    .filter((listing) => listingStoreId(listing) === storeId)
    .map((listing) => ({ listing, score: scoreStoreListingMatch(importRow, listing) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ listing }) => listing)
}
