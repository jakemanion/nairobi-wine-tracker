import type { WineReview, WineRow } from '@/components/wine-table'
import {
  isBuiltinCollectionKey,
  labelForCollectionKey,
  type CollectionKey,
} from '@/lib/share/collection-keys'
import { wineMatchesSharedCollections } from '@/lib/share/collection-membership'
import { createServerReadClient } from '@/lib/supabase-server'

async function loadSharedListMetaBySlug(slug: string): Promise<{
  ownerId: string
  collectionKeys: CollectionKey[]
  error?: string
} | null> {
  const supabase = createServerReadClient()
  const { data: sharedList, error } = await supabase
    .from('shared_lists')
    .select('id, owner_id')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !sharedList) return null

  const { data: collections, error: collectionsError } = await supabase
    .from('shared_list_collections')
    .select('collection_key')
    .eq('shared_list_id', sharedList.id)

  if (collectionsError) {
    return {
      ownerId: sharedList.owner_id,
      collectionKeys: [],
      error: collectionsError.message,
    }
  }

  return {
    ownerId: sharedList.owner_id,
    collectionKeys: (collections ?? []).map((row) => String(row.collection_key)),
  }
}

const WINES_SELECT = `
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
  store_listings (
    id,
    current_price_ksh,
    store_product_url,
    in_stock,
    image_url,
    stores (
      id,
      name
    )
  )
`

type OwnerReviewRow = {
  wine_id: string
  wishlist: number | null
  tried_status: number | null
  shortlist: number | null
}

type ViewerReviewRow = {
  id: string
  wine_id: string
  overall_score: number | null
  value_score: number | null
  wishlist: number | null
  tried_status: number | null
  shortlist: number | null
  hide: boolean | null
  want_to_try: boolean | null
  tasting_notes: string | null
  tasted_on: string | null
}

export type SharedListPageData = {
  slug: string
  collectionLabels: string[]
  wines: WineRow[]
}

function attachViewerReviews(wines: WineRow[], reviews: ViewerReviewRow[]): WineRow[] {
  const byWineId = new Map(reviews.map((review) => [review.wine_id, review]))

  return wines.map((wine) => {
    const review = byWineId.get(String(wine.id))
    if (!review) return wine

    return {
      ...wine,
      review: {
        id: review.id,
        overall_score: review.overall_score,
        value_score: review.value_score,
        wishlist: review.wishlist,
        tried_status: review.tried_status,
        shortlist: review.shortlist,
        hide: review.hide ?? null,
        want_to_try: review.want_to_try,
        tasting_notes: review.tasting_notes,
        tasted_on: review.tasted_on,
      } satisfies WineReview,
    }
  })
}

async function loadCustomWineIdsByCollection(
  ownerId: string,
  collectionKeys: CollectionKey[],
): Promise<Map<string, Set<string>>> {
  const customKeys = collectionKeys.filter((key) => !isBuiltinCollectionKey(key))
  const result = new Map<string, Set<string>>()
  if (customKeys.length === 0) return result

  const supabase = createServerReadClient()
  const { data: collections } = await supabase
    .from('user_collections')
    .select('id')
    .eq('owner_id', ownerId)
    .in('id', customKeys)

  const ownedIds = new Set((collections ?? []).map((row) => String(row.id)))
  const validKeys = customKeys.filter((key) => ownedIds.has(key))
  if (validKeys.length === 0) return result

  const { data: memberships } = await supabase
    .from('user_collection_wines')
    .select('collection_id, wine_id')
    .in('collection_id', validKeys)

  for (const row of memberships ?? []) {
    const collectionId = String(row.collection_id)
    const wineId = String(row.wine_id)
    const set = result.get(collectionId) ?? new Set<string>()
    set.add(wineId)
    result.set(collectionId, set)
  }

  return result
}

/**
 * Resolve shared wines on the server. Never returns the owner's private review fields.
 * Optionally attaches the *viewer's* reviews for wishlist/shortlist actions.
 */
export async function loadSharedListPageData(args: {
  slug: string
  viewerUserId: string | null
}): Promise<SharedListPageData | null> {
  const meta = await loadSharedListMetaBySlug(args.slug)
  if (!meta || meta.error) return null
  if (meta.collectionKeys.length === 0) {
    return { slug: args.slug, collectionLabels: [], wines: [] }
  }

  const supabase = createServerReadClient()
  const needsBuiltin = meta.collectionKeys.some((key) => isBuiltinCollectionKey(key))

  const [winesResult, ownerReviewsResult, customWineIdsByCollection] = await Promise.all([
    supabase.from('wines').select(WINES_SELECT).order('producer').order('wine_name'),
    needsBuiltin
      ? supabase
          .from('reviews')
          .select('wine_id, wishlist, tried_status, shortlist')
          .eq('user_id', meta.ownerId)
      : Promise.resolve({ data: [] as OwnerReviewRow[], error: null }),
    loadCustomWineIdsByCollection(meta.ownerId, meta.collectionKeys),
  ])

  if (winesResult.error) return null

  const ownerReviewsByWineId = new Map(
    ((ownerReviewsResult.data ?? []) as OwnerReviewRow[]).map((review) => [
      String(review.wine_id),
      review,
    ]),
  )

  const matchedWines = ((winesResult.data ?? []) as WineRow[]).filter((wine) =>
    wineMatchesSharedCollections({
      wineId: String(wine.id),
      review: ownerReviewsByWineId.get(String(wine.id)),
      selectedKeys: meta.collectionKeys,
      customWineIdsByCollection,
    }),
  )

  // Strip any accidental review payload from catalog wines.
  const publicWines: WineRow[] = matchedWines.map(({ review: _ignored, ...wine }) => wine)

  let winesWithViewerReviews = publicWines
  if (args.viewerUserId) {
    const wineIds = publicWines.map((wine) => String(wine.id))
    if (wineIds.length > 0) {
      const { data: viewerReviews } = await supabase
        .from('reviews')
        .select(
          `
          id,
          wine_id,
          overall_score,
          value_score,
          wishlist,
          tried_status,
          shortlist,
          hide,
          want_to_try,
          tasting_notes,
          tasted_on
        `,
        )
        .eq('user_id', args.viewerUserId)
        .in('wine_id', wineIds)

      winesWithViewerReviews = attachViewerReviews(
        publicWines,
        (viewerReviews ?? []) as ViewerReviewRow[],
      )
    }
  }

  return {
    slug: args.slug,
    collectionLabels: await resolveCollectionLabels(meta.ownerId, meta.collectionKeys),
    wines: winesWithViewerReviews,
  }
}

async function resolveCollectionLabels(
  ownerId: string,
  collectionKeys: CollectionKey[],
): Promise<string[]> {
  const customKeys = collectionKeys.filter((key) => !isBuiltinCollectionKey(key))
  const labelByKey = new Map<string, string>()

  for (const option of collectionKeys) {
    if (isBuiltinCollectionKey(option)) {
      labelByKey.set(option, labelForCollectionKey(option))
    }
  }

  if (customKeys.length > 0) {
    const supabase = createServerReadClient()
    const { data } = await supabase
      .from('user_collections')
      .select('id, label')
      .eq('owner_id', ownerId)
      .in('id', customKeys)

    for (const row of data ?? []) {
      labelByKey.set(String(row.id), String(row.label))
    }
  }

  return collectionKeys.map((key) => labelByKey.get(key) ?? labelForCollectionKey(key))
}
