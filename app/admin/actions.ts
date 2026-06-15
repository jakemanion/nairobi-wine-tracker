'use server'

import { revalidatePath } from 'next/cache'
import { buildWineFromListing } from '@/lib/build-wine-from-listing'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  normalizeStoreListing,
  type StoreListingField,
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
  vivino_rating
`

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

type WineMutationResult =
  | { wine: WineRecord; error?: undefined }
  | { wine?: undefined; error: string }

type ListingMutationResult =
  | { listing: StoreListingRecord; error?: undefined }
  | { listing?: undefined; error: string }

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

export async function adminDeleteStoreListing(
  listingId: string,
): Promise<{ error?: string }> {
  const { client, configError } = getAdminClient()
  if (!client) return { error: configError! }

  const { error } = await client.from('store_listings').delete().eq('id', listingId)

  if (error) return { error: error.message }

  revalidateWinePages()
  return {}
}

export async function adminDeleteWine(wineId: string): Promise<{ error?: string }> {
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
