import { normalizeGrapeVarieties } from '@/lib/grape-varieties'
import { parseListingTitle } from '@/lib/parse-listing-title'
import type { StoreListingRecord } from '@/lib/store-listings'
import type { WineRecord } from '@/lib/wines'

export function buildWineFromListing(
  listing: StoreListingRecord,
): Partial<Omit<WineRecord, 'id'>> {
  const parsed = parseListingTitle(listing.raw_title)

  return {
    ...parsed,
    vintage: listing.vintage ?? parsed.vintage ?? null,
    country: listing.country ?? parsed.country ?? null,
    region: listing.region ?? parsed.region ?? null,
    grape_varieties: normalizeGrapeVarieties(
      listing.grape_varieties ?? parsed.grape_varieties ?? null,
    ),
  }
}
