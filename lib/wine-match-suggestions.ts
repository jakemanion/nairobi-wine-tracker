import type { StoreListingRecord } from '@/lib/store-listings'
import type { WineRecord } from '@/lib/wines'

function normalizeMatchText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

export function scoreWineMatch(
  listing: Pick<StoreListingRecord, 'producer' | 'raw_title'>,
  wine: Pick<WineRecord, 'producer' | 'wine_name'>,
): number {
  const listingProducer = normalizeMatchText(listing.producer)
  const listingName = normalizeMatchText(listing.raw_title)
  const wineProducer = normalizeMatchText(wine.producer)
  const wineName = normalizeMatchText(wine.wine_name)

  if ((!listingProducer && !listingName) || (!wineProducer && !wineName)) {
    return 0
  }

  let score = 0

  if (listingProducer && wineProducer) {
    if (listingProducer === wineProducer) score += 40
    else if (listingProducer.includes(wineProducer) || wineProducer.includes(listingProducer)) {
      score += 20
    }
  }

  if (listingName && wineName) {
    if (listingName === wineName) score += 40
    else if (listingName.includes(wineName) || wineName.includes(listingName)) {
      score += 25
    }
  }

  if (listingName && wineProducer && listingName.includes(wineProducer)) score += 15
  if (wineName && listingProducer && wineName.includes(listingProducer)) score += 15

  const wineCombined = [wineProducer, wineName].filter(Boolean).join(' ')
  if (listingName && wineCombined) {
    if (listingName === wineCombined) score += 30
    else if (listingName.includes(wineCombined) || wineCombined.includes(listingName)) {
      score += 15
    }
  }

  return score
}

export function suggestWineMatches(
  listing: StoreListingRecord,
  wines: WineRecord[],
  limit = 5,
): WineRecord[] {
  return wines
    .map((wine) => ({ wine, score: scoreWineMatch(listing, wine) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ wine }) => wine)
}
