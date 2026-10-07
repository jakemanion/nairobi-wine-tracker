import type { SortCriterion, SortDir, SortFieldKey } from '@/components/wine-filter-panel'
import { minWinePriceKES } from '@/lib/calculate-value-score'

export type WineReview = {
  id: string
  overall_score: number | null
  value_score: number | null
  wishlist: number | null
  tried_status: number | null
  shortlist: number | null
  hide: boolean | null
  want_to_try?: boolean | null
  tried?: boolean | null
  would_buy_again?: boolean | null
  tasting_notes: string | null
  tasted_on: string | null
}

export type WineRow = {
  id: string | number
  producer: string | null
  wine_name: string | null
  vintage: string | number | null
  country: string | null
  region: string | null
  grape_varieties: unknown
  style: string | null
  vivino_url: string | null
  vivino_rating: string | number | null
  valueScore?: number | null
  review?: WineReview | null
  store_listings?: Array<{
    id: string | number
    current_price_ksh: string | number | null
    store_product_url: string | null
    in_stock: boolean | null
    image_url?: string | null
    stores?: { id?: string | number; name?: string | null } | null
  }> | null
}

type DisplayWineRow = WineRow & { valueScore: number | null }

function triedStatusSortNum(value: number | null | undefined): number | null {
  if (value == null) return null
  if (value === 0 || value === 1 || value === 2) return value
  return null
}

function wishlistSortNum(value: number | null | undefined): number | null {
  if (value == null) return null
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return null
}

function formatGrapeVarieties(value: unknown): string {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function vintageNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

function ratingNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function minListingPrice(wine: Pick<WineRow, 'store_listings'>): number | null {
  return minWinePriceKES(wine.store_listings)
}

function compareEmptyLast(aEmpty: boolean, bEmpty: boolean, body: () => number): number {
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  return body()
}

function compareWineField(a: DisplayWineRow, b: DisplayWineRow, key: SortFieldKey): number {
  switch (key) {
    case 'winery': {
      const as = str(a.producer).toLowerCase()
      const bs = str(b.producer).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'wine_name': {
      const as = str(a.wine_name).toLowerCase()
      const bs = str(b.wine_name).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'vintage': {
      const an = vintageNum(a.vintage)
      const bn = vintageNum(b.vintage)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'country': {
      const as = str(a.country).toLowerCase()
      const bs = str(b.country).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'region': {
      const as = str(a.region).toLowerCase()
      const bs = str(b.region).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'grapes': {
      const as = formatGrapeVarieties(a.grape_varieties).toLowerCase()
      const bs = formatGrapeVarieties(b.grape_varieties).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'style': {
      const as = str(a.style).toLowerCase()
      const bs = str(b.style).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'vivino_rating': {
      const an = ratingNum(a.vivino_rating)
      const bn = ratingNum(b.vivino_rating)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'value_score': {
      const an = a.valueScore
      const bn = b.valueScore
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'my_rating': {
      const an = ratingNum(a.review?.overall_score)
      const bn = ratingNum(b.review?.overall_score)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'store_prices': {
      const an = minListingPrice(a)
      const bn = minListingPrice(b)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'wishlist': {
      const an = wishlistSortNum(a.review?.wishlist)
      const bn = wishlistSortNum(b.review?.wishlist)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'tried_status': {
      const an = triedStatusSortNum(a.review?.tried_status)
      const bn = triedStatusSortNum(b.review?.tried_status)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'notes': {
      const as = str(a.review?.tasting_notes).toLowerCase()
      const bs = str(b.review?.tasting_notes).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    default:
      return 0
  }
}

function isSortFieldEmpty(wine: DisplayWineRow, key: SortFieldKey): boolean {
  switch (key) {
    case 'winery':
      return !str(wine.producer)
    case 'wine_name':
      return !str(wine.wine_name)
    case 'vintage':
      return vintageNum(wine.vintage) == null
    case 'country':
      return !str(wine.country)
    case 'region':
      return !str(wine.region)
    case 'grapes':
      return !formatGrapeVarieties(wine.grape_varieties)
    case 'style':
      return !str(wine.style)
    case 'vivino_rating':
      return ratingNum(wine.vivino_rating) == null
    case 'value_score':
      return wine.valueScore == null
    case 'store_prices':
      return minListingPrice(wine) == null
    case 'my_rating':
      return ratingNum(wine.review?.overall_score) == null
    case 'wishlist':
      return wishlistSortNum(wine.review?.wishlist) == null
    case 'tried_status':
      return triedStatusSortNum(wine.review?.tried_status) == null
    case 'notes':
      return !str(wine.review?.tasting_notes)
    default:
      return false
  }
}

function compareByCriterion(
  a: DisplayWineRow,
  b: DisplayWineRow,
  key: SortFieldKey,
  dir: SortDir,
): number {
  if (key === 'value_score') {
    const an = a.valueScore
    const bn = b.valueScore
    if (an == null && bn == null) return 0
    if (an == null) return 1
    if (bn == null) return -1
    return dir === 'desc' ? bn - an : an - bn
  }

  const ascending = compareWineField(a, b, key)
  if (ascending === 0) return 0
  if (isSortFieldEmpty(a, key) || isSortFieldEmpty(b, key)) return ascending

  return dir === 'asc' ? ascending : -ascending
}

export function sortWines(
  rows: DisplayWineRow[],
  primary: SortCriterion,
  secondary: SortCriterion,
): DisplayWineRow[] {
  return [...rows].sort((a, b) => {
    if (primary.key !== 'none') {
      const primaryCmp = compareByCriterion(a, b, primary.key, primary.dir)
      if (primaryCmp !== 0) return primaryCmp
    }

    if (secondary.key !== 'none' && secondary.key !== primary.key) {
      return compareByCriterion(a, b, secondary.key, secondary.dir)
    }

    return 0
  })
}
