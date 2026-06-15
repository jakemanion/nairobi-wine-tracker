import { buildWineFromListing } from '@/lib/build-wine-from-listing'
import { supabase } from '@/lib/supabase'
import { createWine, type WineRecord } from '@/lib/wines'

export type StoreListingRecord = {
  id: string
  raw_title: string | null
  store_product_url: string | null
  image_url: string | null
  current_price_ksh: string | number | null
  wine_id: string | null
  in_stock: boolean | null
  producer: string | null
  vintage: string | number | null
  country: string | null
  region: string | null
  style: string | null
  grape_varieties: unknown
  stores?: { id?: string; name?: string | null } | null
  wines?: Pick<WineRecord, 'id' | 'producer' | 'wine_name' | 'vintage'> | null
}

export type StoreListingField =
  | 'producer'
  | 'raw_title'
  | 'store_product_url'
  | 'current_price_ksh'
  | 'in_stock'
  | 'vintage'
  | 'country'
  | 'region'
  | 'style'
  | 'grape_varieties'

const listingSelect = `
  id,
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

type UpdateStoreListingFieldArgs = {
  listingId: string
  field: StoreListingField
  value: string | number | boolean | null
}

type ListingMutationResult =
  | { listing: StoreListingRecord; error?: undefined }
  | { listing?: undefined; error: string }

function normalizeRelation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null
  if (value && typeof value === 'object') return value as T
  return null
}

export function normalizeStoreListing(raw: unknown): StoreListingRecord {
  const row = raw as StoreListingRecord & {
    stores?: unknown
    wines?: unknown
  }

  return {
    ...row,
    stores: normalizeRelation<{ id?: string; name?: string | null }>(row.stores),
    wines: normalizeRelation<NonNullable<StoreListingRecord['wines']>>(row.wines),
  }
}

export async function updateStoreListingField({
  listingId,
  field,
  value,
}: UpdateStoreListingFieldArgs): Promise<ListingMutationResult> {
  const { data, error } = await supabase
    .from('store_listings')
    .update({ [field]: value })
    .eq('id', listingId)
    .select(listingSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Update failed.' }

  return { listing: normalizeStoreListing(data) }
}

export async function matchStoreListingToWine({
  listingId,
  wineId,
}: {
  listingId: string
  wineId: string
}): Promise<ListingMutationResult> {
  const { data, error } = await supabase
    .from('store_listings')
    .update({ wine_id: wineId })
    .eq('id', listingId)
    .select(listingSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Match failed.' }

  return { listing: normalizeStoreListing(data) }
}

export async function clearStoreListingMatch(
  listingId: string,
): Promise<ListingMutationResult> {
  const { data, error } = await supabase
    .from('store_listings')
    .update({ wine_id: null })
    .eq('id', listingId)
    .select(listingSelect)
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Clear match failed.' }

  return { listing: normalizeStoreListing(data) }
}

type PromoteListingResult =
  | { wine: WineRecord; listing: StoreListingRecord; error?: undefined }
  | { wine?: undefined; listing?: undefined; error: string }

export async function promoteListingToCanonicalWine(
  listing: StoreListingRecord,
): Promise<PromoteListingResult> {
  const wineResult = await createWine(buildWineFromListing(listing))
  if (wineResult.error || !wineResult.wine) {
    return { error: wineResult.error ?? 'Failed to create wine.' }
  }

  const matchResult = await matchStoreListingToWine({
    listingId: listing.id,
    wineId: wineResult.wine.id,
  })

  if (matchResult.error || !matchResult.listing) {
    return { error: matchResult.error ?? 'Wine created but linking failed.' }
  }

  return {
    wine: wineResult.wine,
    listing: matchResult.listing,
  }
}
