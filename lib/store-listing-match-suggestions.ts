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
  return listing.stores?.id ?? null
}

export function suggestStoreListingMatches(
  importRow: StoreListingImportRecord,
  listings: StoreListingRecord[],
  limit = 10,
): StoreListingRecord[] {
  const storeId = importStoreId(importRow)
  const candidates = storeId
    ? listings.filter((listing) => listingStoreId(listing) === storeId)
    : listings

  return candidates
    .map((listing) => ({ listing, score: scoreStoreListingMatch(importRow, listing) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ listing }) => listing)
}
