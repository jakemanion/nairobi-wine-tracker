import { minWinePriceKES } from '@/lib/calculate-value-score'
import { listGrapeVarieties } from '@/lib/grape-varieties'
import type { WineRow } from '@/components/wine-table'

export type WishlistFilterValue = 'unset' | 0 | 1 | 2 | 3
export type TriedStatusFilterValue = 'unset' | 0 | 1 | 2

export type WineFilters = {
  priceMin: string
  priceMax: string
  vivinoMin: string
  vivinoMax: string
  wishlist: WishlistFilterValue[]
  triedStatus: TriedStatusFilterValue[]
  stores: string[]
  disabledStores: string[]
  hideUnwanted: boolean
  grapes: string[]
  producer: string
  country: string
  region: string
}

export const EMPTY_WINE_FILTERS: WineFilters = {
  priceMin: '',
  priceMax: '',
  vivinoMin: '',
  vivinoMax: '',
  wishlist: [],
  triedStatus: [],
  stores: [],
  disabledStores: [],
  hideUnwanted: false,
  grapes: [],
  producer: '',
  country: '',
  region: '',
}

export const BEST_UNDER_PRICE_PRESETS = [1500, 2000, 3000, 4000, 5000] as const

export function computeListPriceBounds(
  wines: WineRow[],
): { min: number; max: number; median: number } | null {
  let min: number | null = null
  let max: number | null = null

  for (const wine of wines) {
    const price = minWinePriceKES(wine.store_listings)
    if (price == null) continue
    min = min == null ? price : Math.min(min, price)
    max = max == null ? price : Math.max(max, price)
  }

  if (min == null || max == null) return null

  const roundedMax = Math.ceil(max / 100) * 100
  const roundedMin = Math.floor(min / 100) * 100
  const median = computeMedianPrice(wines)

  return { min: roundedMin, max: roundedMax, median }
}

function collectWinePrices(wines: WineRow[]): number[] {
  const prices: number[] = []
  for (const wine of wines) {
    const price = minWinePriceKES(wine.store_listings)
    if (price != null) prices.push(price)
  }
  return prices
}

function computeMedianPrice(wines: WineRow[]): number {
  const prices = collectWinePrices(wines).sort((a, b) => a - b)
  if (prices.length === 0) return 1000

  const mid = Math.floor(prices.length / 2)
  const median =
    prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid]

  return Math.round(median / 100) * 100
}

function parseBound(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed)
  return Number.isFinite(n) ? n : null
}

function ratingNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function normalizeWishlist(value: number | null | undefined): WishlistFilterValue {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return 'unset'
}

function normalizeTriedStatus(value: number | null | undefined): TriedStatusFilterValue {
  if (value === 0 || value === 1 || value === 2) return value
  return 'unset'
}

export function collectFilterOptions(wines: WineRow[]) {
  const stores = new Set<string>()
  const producers = new Set<string>()
  const countries = new Set<string>()
  const regions = new Set<string>()
  const grapes = new Set<string>()

  for (const wine of wines) {
    const producer = wine.producer?.trim()
    if (producer) producers.add(producer)

    const country = wine.country?.trim()
    if (country) countries.add(country)

    const region = wine.region?.trim()
    if (region) regions.add(region)

    for (const grape of listGrapeVarieties(wine.grape_varieties)) {
      grapes.add(grape)
    }

    for (const listing of wine.store_listings ?? []) {
      const name = listing.stores?.name?.trim()
      if (name) stores.add(name)
    }
  }

  const sortAlpha = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

  return {
    stores: [...stores].sort(sortAlpha),
    producers: [...producers].sort(sortAlpha),
    countries: [...countries].sort(sortAlpha),
    regions: [...regions].sort(sortAlpha),
    grapes: [...grapes].sort(sortAlpha),
  }
}

export function countActiveFilters(filters: WineFilters): number {
  let count = 0
  if (filters.priceMin.trim()) count += 1
  if (filters.priceMax.trim()) count += 1
  if (filters.vivinoMin.trim()) count += 1
  if (filters.vivinoMax.trim()) count += 1
  if (filters.wishlist.length > 0) count += 1
  if (filters.triedStatus.length > 0) count += 1
  if (filters.stores.length > 0) count += 1
  if (filters.grapes.length > 0) count += 1
  if (filters.producer.trim()) count += 1
  if (filters.country.trim()) count += 1
  if (filters.region.trim()) count += 1
  if (filters.hideUnwanted) count += 1
  if (filters.disabledStores.length > 0) count += 1
  return count
}

export function filterWines<T extends WineRow>(wines: T[], filters: WineFilters): T[] {
  const priceMin = parseBound(filters.priceMin)
  const priceMax = parseBound(filters.priceMax)
  const vivinoMin = parseBound(filters.vivinoMin)
  const vivinoMax = parseBound(filters.vivinoMax)
  const producerFilter = filters.producer.trim()
  const countryFilter = filters.country.trim()
  const regionFilter = filters.region.trim()
  const selectedGrapes = filters.grapes.map((grape) => grape.toLowerCase())

  return wines.filter((wine) => {
    const price = minWinePriceKES(wine.store_listings)
    if (priceMin != null && (price == null || price < priceMin)) return false
    if (priceMax != null && (price == null || price > priceMax)) return false

    const vivino = ratingNum(wine.vivino_rating)
    if (vivinoMin != null && (vivino == null || vivino < vivinoMin)) return false
    if (vivinoMax != null && (vivino == null || vivino > vivinoMax)) return false

    if (filters.wishlist.length > 0) {
      const wishlist = normalizeWishlist(wine.review?.wishlist)
      if (!filters.wishlist.includes(wishlist)) return false
    }

    if (filters.triedStatus.length > 0) {
      const tried = normalizeTriedStatus(wine.review?.tried_status)
      if (!filters.triedStatus.includes(tried)) return false
    }

    if (filters.stores.length > 0) {
      const wineStores = new Set(
        (wine.store_listings ?? [])
          .map((listing) => listing.stores?.name?.trim())
          .filter(Boolean) as string[],
      )
      if (!filters.stores.some((store) => wineStores.has(store))) return false
    }

    if (filters.disabledStores.length > 0) {
      const wineStores = (wine.store_listings ?? [])
        .map((listing) => listing.stores?.name?.trim())
        .filter(Boolean) as string[]
      if (wineStores.some((store) => filters.disabledStores.includes(store))) {
        return false
      }
    }

    if (filters.hideUnwanted) {
      if (wine.review?.wishlist === 0 || wine.review?.tried_status === 2) return false
    }

    if (selectedGrapes.length > 0) {
      const wineGrapes = new Set(
        listGrapeVarieties(wine.grape_varieties).map((grape) => grape.toLowerCase()),
      )
      if (!selectedGrapes.some((grape) => wineGrapes.has(grape))) return false
    }

    if (producerFilter && (wine.producer?.trim() ?? '') !== producerFilter) return false
    if (countryFilter && (wine.country?.trim() ?? '') !== countryFilter) return false
    if (regionFilter && (wine.region?.trim() ?? '') !== regionFilter) return false

    return true
  })
}
