'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAccess } from '@/lib/auth/admin'
import { buildWineFromListing } from '@/lib/build-wine-from-listing'
import { normalizeGrapeVarieties } from '@/lib/grape-varieties'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  normalizeStoreListing,
  normalizeStoreListingImport,
  type StoreListingField,
  type StoreListingImportRecord,
  type StoreListingRecord,
} from '@/lib/store-listings'
import type { WineField, WineRecord } from '@/lib/wines'

const wineSelect = `
  id,
  producer,
  wine_name,
  vintage,
  country,
  region,
  grape_varieties,
  style,
  vivino_url,
  vivino_rating,
  vivino_match_confidence,
  vivino_enrichment_status
`

const listingSelect = `
  id,
  store_id,
  raw_title,
  store_product_url,
  image_url,
  current_price_ksh,
  wine_id,
  in_stock,
  producer,
  vintage,
  country,
  region,
  style,
  grape_varieties,
  stores (
    id,
    name
  ),
  wines (
    id,
    producer,
    wine_name,
    vintage
  )
`

const importSelect = `
  id,
  store_id,
  raw_title,
  store_product_url,
  image_url,
  current_price_ksh,
  in_stock,
  producer,
  vintage,
  country,
  region,
  style,
  grape_varieties,
  status,
  matched_store_listing_id,
  stores (
    id,
    name
  )
`

type WineMutationResult =
  | { wine: WineRecord; error?: undefined }
  | { wine?: undefined; error: string }

type ListingMutationResult =
  | { listing: StoreListingRecord; error?: undefined }
  | { listing?: undefined; error: string }

type ImportMutationResult =
  | { importRow: StoreListingImportRecord; error?: undefined }
  | { importRow?: undefined; error: string }

function adminErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

function getAdminClient() {
  try {
    return { client: createAdminClient(), configError: null as string | null }
  } catch (error) {
    return {
      client: null,
      configError: adminErrorMessage(error, 'Admin database client is not configured.'),
    }
  }
}

function revalidateWinePages() {
  revalidatePath('/admin')
  revalidatePath('/')
}

export async function adminUpdateWineField({
  wineId,
  field,
  value,
}: {
  wineId: string
  field: WineField
  value: string | number | null
}): Promise<WineMutationResult> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { data, error } = await client
    .from('wines')
    .update({ [field]: value })
    .eq('id', wineId)
    .select(wineSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Update failed — no row returned.' }

  revalidateWinePages()
  return { wine: data as WineRecord }
}

export async function adminCreateWine(
  data: Partial<Omit<WineRecord, 'id'>> = {},
): Promise<WineMutationResult> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { data: wine, error } = await client
    .from('wines')
    .insert(data)
    .select(wineSelect)
    .single()

  if (error) return { error: error.message }

  revalidateWinePages()
  return { wine: wine as WineRecord }
}

export async function adminUpdateStoreListingField({
  listingId,
  field,
  value,
}: {
  listingId: string
  field: StoreListingField
  value: string | number | boolean | null
}): Promise<ListingMutationResult> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { data, error } = await client
    .from('store_listings')
    .update({ [field]: value })
    .eq('id', listingId)
    .select(listingSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Update failed — no row returned.' }

  revalidateWinePages()
  return { listing: normalizeStoreListing(data) }
}

export async function adminMatchStoreListingToWine({
  listingId,
  wineId,
}: {
  listingId: string
  wineId: string
}): Promise<ListingMutationResult> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { data, error } = await client
    .from('store_listings')
    .update({ wine_id: wineId })
    .eq('id', listingId)
    .select(listingSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Match failed — no row returned.' }

  revalidateWinePages()
  return { listing: normalizeStoreListing(data) }
}

export async function adminClearStoreListingMatch(
  listingId: string,
): Promise<ListingMutationResult> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { data, error } = await client
    .from('store_listings')
    .update({ wine_id: null })
    .eq('id', listingId)
    .select(listingSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Clear match failed — no row returned.' }

  revalidateWinePages()
  return { listing: normalizeStoreListing(data) }
}

export async function adminMatchImportToStoreListing({
  importId,
  storeListingId,
}: {
  importId: string
  storeListingId: string
}): Promise<ImportMutationResult> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { data, error } = await client
    .from('store_listings_imports')
    .update({ matched_store_listing_id: storeListingId, status: 'matched' })
    .eq('id', importId)
    .select(importSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Import match failed — no row returned.' }

  revalidatePath('/admin')
  return { importRow: normalizeStoreListingImport(data) }
}

export async function adminUpdateImportStatus({
  importId,
  status,
}: {
  importId: string
  status: string
}): Promise<ImportMutationResult> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { data, error } = await client
    .from('store_listings_imports')
    .update({ status })
    .eq('id', importId)
    .select(importSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Import status update failed — no row returned.' }

  revalidatePath('/admin')
  return { importRow: normalizeStoreListingImport(data) }
}

export async function adminMarkImportsDone(
  importIds: string[],
): Promise<
  | { importRows: StoreListingImportRecord[]; updatedCount: number; error?: undefined }
  | { importRows?: undefined; updatedCount: number; error: string }
> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error, updatedCount: 0 }

  if (importIds.length === 0) return { importRows: [], updatedCount: 0 }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError!, updatedCount: 0 }

  const { data, error } = await client
    .from('store_listings_imports')
    .update({ status: 'done' })
    .in('id', importIds)
    .select(importSelect)

  if (error) return { error: error.message, updatedCount: 0 }

  const importRows = (data ?? []).map(normalizeStoreListingImport)
  revalidatePath('/admin')
  return { importRows, updatedCount: importRows.length }
}

function storeListingInsertFromImport(
  importRow: StoreListingImportRecord,
  storeId: string,
) {
  return {
    store_id: storeId,
    raw_title: importRow.raw_title,
    store_product_url: importRow.store_product_url,
    image_url: importRow.image_url,
    current_price_ksh: importRow.current_price_ksh,
    in_stock: importRow.in_stock,
    producer: importRow.producer,
    vintage: importRow.vintage,
    country: importRow.country,
    region: importRow.region,
    style: importRow.style,
    grape_varieties: normalizeGrapeVarieties(importRow.grape_varieties),
    wine_id: null,
  }
}

function importRowStoreId(importRow: StoreListingImportRecord): string | null {
  return importRow.store_id ?? importRow.stores?.id ?? null
}

function isBulkAddImportCandidate(importRow: StoreListingImportRecord): boolean {
  if (importRow.matched_store_listing_id) return false
  if (importRow.status?.trim().toLowerCase() === 'done') return false
  return Boolean(importRowStoreId(importRow))
}

export async function adminCreateStoreListingFromImport(
  importRow: StoreListingImportRecord,
): Promise<
  | { listing: StoreListingRecord; importRow: StoreListingImportRecord; error?: undefined }
  | { listing?: undefined; importRow?: undefined; error: string }
> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const storeId = importRowStoreId(importRow)
  if (!storeId) return { error: 'Import has no store id.' }

  const { data: listingData, error: listingError } = await client
    .from('store_listings')
    .insert(storeListingInsertFromImport(importRow, storeId))
    .select(listingSelect)
    .maybeSingle()

  if (listingError) return { error: listingError.message }
  if (!listingData) return { error: 'Failed to create store listing.' }

  const listing = normalizeStoreListing(listingData)

  const { data: matchedImport, error: matchError } = await client
    .from('store_listings_imports')
    .update({
      matched_store_listing_id: listing.id,
      status: 'done',
    })
    .eq('id', importRow.id)
    .select(importSelect)
    .maybeSingle()

  if (matchError) {
    return {
      error: `Store listing created but import link failed: ${matchError.message}`,
    }
  }
  if (!matchedImport) {
    return { error: 'Store listing created but import link returned no row.' }
  }

  revalidateWinePages()
  return {
    listing,
    importRow: normalizeStoreListingImport(matchedImport),
  }
}

export async function adminBulkCreateStoreListingsFromImports(
  importIds: string[],
): Promise<
  | {
      listings: StoreListingRecord[]
      importRows: StoreListingImportRecord[]
      createdCount: number
      error?: undefined
    }
  | {
      listings: StoreListingRecord[]
      importRows: StoreListingImportRecord[]
      createdCount: number
      error: string
    }
> {
  const access = await requireAdminAccess()
  if (!access.ok) {
    return { listings: [], importRows: [], createdCount: 0, error: access.error }
  }

  if (importIds.length === 0) {
    return { listings: [], importRows: [], createdCount: 0 }
  }

  const { client, configError } = getAdminClient()
  if (!client) {
    return { listings: [], importRows: [], createdCount: 0, error: configError! }
  }

  const { data: importData, error: importFetchError } = await client
    .from('store_listings_imports')
    .select(importSelect)
    .in('id', importIds)

  if (importFetchError) {
    return {
      listings: [],
      importRows: [],
      createdCount: 0,
      error: importFetchError.message,
    }
  }

  const candidates = (importData ?? [])
    .map(normalizeStoreListingImport)
    .filter(isBulkAddImportCandidate)

  const createdListings: StoreListingRecord[] = []
  const updatedImports: StoreListingImportRecord[] = []

  for (const importRow of candidates) {
    const storeId = importRowStoreId(importRow)
    if (!storeId) continue

    const { data: listingData, error: listingError } = await client
      .from('store_listings')
      .insert(storeListingInsertFromImport(importRow, storeId))
      .select(listingSelect)
      .maybeSingle()

    if (listingError || !listingData) {
      revalidateWinePages()
      return {
        listings: createdListings,
        importRows: updatedImports,
        createdCount: createdListings.length,
        error: `Stopped after ${createdListings.length} created. Failed on "${importRow.raw_title ?? importRow.id}": ${listingError?.message ?? 'no row returned'}`,
      }
    }

    const listing = normalizeStoreListing(listingData)

    const { data: matchedImport, error: matchError } = await client
      .from('store_listings_imports')
      .update({
        matched_store_listing_id: listing.id,
        status: 'done',
      })
      .eq('id', importRow.id)
      .select(importSelect)
      .maybeSingle()

    if (matchError || !matchedImport) {
      revalidateWinePages()
      return {
        listings: [...createdListings, listing],
        importRows: updatedImports,
        createdCount: createdListings.length + 1,
        error: `Created listing for "${importRow.raw_title ?? importRow.id}" but failed to mark import done: ${matchError?.message ?? 'no row returned'}`,
      }
    }

    createdListings.push(listing)
    updatedImports.push(normalizeStoreListingImport(matchedImport))
  }

  revalidateWinePages()
  return {
    listings: createdListings,
    importRows: updatedImports,
    createdCount: createdListings.length,
  }
}

export async function adminDeleteStoreListing(
  listingId: string,
): Promise<{ error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { error } = await client.from('store_listings').delete().eq('id', listingId)

  if (error) return { error: error.message }

  revalidateWinePages()
  return {}
}

export async function adminDeleteWine(wineId: string): Promise<{ error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { error: unlinkError } = await client
    .from('store_listings')
    .update({ wine_id: null })
    .eq('wine_id', wineId)

  if (unlinkError) return { error: unlinkError.message }

  const { error: reviewsError } = await client.from('reviews').delete().eq('wine_id', wineId)

  if (reviewsError) return { error: reviewsError.message }

  const { error } = await client.from('wines').delete().eq('id', wineId)

  if (error) return { error: error.message }

  revalidateWinePages()
  return {}
}

export async function adminPromoteListingToCanonicalWine(
  listing: StoreListingRecord,
): Promise<
  | { wine: WineRecord; listing: StoreListingRecord; error?: undefined }
  | { wine?: undefined; listing?: undefined; error: string }
> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const wineResult = await adminCreateWine(buildWineFromListing(listing))
  if (wineResult.error || !wineResult.wine) {
    return { error: wineResult.error ?? 'Failed to create wine.' }
  }

  const matchResult = await adminMatchStoreListingToWine({
    listingId: listing.id,
    wineId: wineResult.wine.id,
  })

  if (matchResult.error || !matchResult.listing) {
    return { error: matchResult.error ?? 'Wine created but linking failed.' }
  }

  revalidateWinePages()
  return {
    wine: wineResult.wine,
    listing: matchResult.listing,
  }
}
