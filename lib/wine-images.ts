import { sanitizeHttpUrl } from '@/lib/safe-http-url'

export const WINE_IMAGES_BUCKET = 'wine-images'

export type ImageMigrationStatus = 'pending' | 'success' | 'failed' | 'skipped'

export type WineImageSource = {
  hosted_image_path?: string | null
  image_migration_status?: string | null
}

export type ListingImageSource = {
  image_url?: string | null
}

/** Stable storage object path for a canonical wine bottle image. */
export function wineImageStoragePath(wineId: string, extension: string): string {
  const ext = extension.replace(/^\./, '').toLowerCase()
  return `${wineId}/original.${ext}`
}

/**
 * Public URL for an object in the wine-images bucket.
 * Uses NEXT_PUBLIC_SUPABASE_URL only (safe for client).
 */
export function getWineImagePublicUrl(path: string | null | undefined): string | null {
  if (path == null) return null
  const trimmed = path.trim().replace(/^\/+/, '')
  if (!trimmed) return null

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return null

  return `${base}/storage/v1/object/public/${WINE_IMAGES_BUCKET}/${trimmed}`
}

/** Hosted image URL when migration succeeded. */
export function resolveWineHostedImageUrl(wine: WineImageSource): string | null {
  if (wine.image_migration_status === 'success' && wine.hosted_image_path) {
    return getWineImagePublicUrl(wine.hosted_image_path)
  }
  return null
}

/** Retailer/store-hosted image URL on a listing (never a Supabase path). */
export function resolveListingImageUrl(listing: ListingImageSource): string | null {
  return sanitizeHttpUrl(listing.image_url)
}

export function firstListingImageUrl(
  listings: Array<ListingImageSource> | null | undefined,
): string | null {
  for (const listing of listings ?? []) {
    const url = resolveListingImageUrl(listing)
    if (url) return url
  }
  return null
}

/**
 * Optional kill switch. When set to `"false"`, public UI never uses hosted images.
 * Unset / any other value prefers hosted Storage images when migration succeeded.
 */
export function isHostedWineImagesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_HOSTED_WINE_IMAGES !== 'false'
}

/**
 * Public UI: prefer hosted Storage image when available; otherwise retailer URL.
 * Wine visibility on the site is controlled separately by `wines.show_on_site`.
 */
export function resolveWineDisplayImage(
  wine: WineImageSource & {
    store_listings?: Array<ListingImageSource> | null
  },
): string | null {
  if (isHostedWineImagesEnabled()) {
    const hosted = resolveWineHostedImageUrl(wine)
    if (hosted) return hosted
  }
  return firstListingImageUrl(wine.store_listings)
}

/**
 * Admin matcher preview: always use the Supabase-hosted wine image when present.
 * Does not fall back to retailer URLs so side-by-side comparison stays honest.
 */
export function resolveWineAdminImage(wine: WineImageSource): string | null {
  return resolveWineHostedImageUrl(wine)
}
