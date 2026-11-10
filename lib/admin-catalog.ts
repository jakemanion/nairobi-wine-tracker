import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllPaged } from '@/lib/supabase-server'
import type { WineRecord } from '@/lib/wines'

const IMPORT_SELECT = `
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

const LISTING_SELECT = `
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
  wines!wine_id (
    id,
    producer,
    wine_name,
    vintage
  )
`

const WINE_SELECT = `
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
  quality_rating,
  quality_rating_override,
  hosted_image_path,
  image_migration_status,
  image_source_listing_id,
  show_on_site
`

/**
 * Load the full admin matcher/pipeline catalog.
 * Paginates past the Supabase/PostgREST 1000-row default so later-alphabet
 * listings and wines are not silently dropped.
 */
export async function fetchAdminCatalog(supabase: SupabaseClient) {
  const [importsResult, listingsResult, winesResult] = await Promise.all([
    fetchAllPaged((from, to) =>
      supabase
        .from('store_listings_imports')
        .select(IMPORT_SELECT)
        .order('raw_title')
        .range(from, to),
    ),
    fetchAllPaged((from, to) =>
      supabase
        .from('store_listings')
        .select(LISTING_SELECT)
        .order('raw_title')
        .range(from, to),
    ),
    fetchAllPaged((from, to) =>
      supabase
        .from('wines')
        .select(WINE_SELECT)
        .order('producer')
        .order('wine_name')
        .range(from, to),
    ),
  ])

  return {
    imports: importsResult.data,
    listings: listingsResult.data,
    wines: winesResult.data as WineRecord[],
    error:
      importsResult.error?.message ??
      listingsResult.error?.message ??
      winesResult.error?.message ??
      null,
  }
}
