import { minWinePriceKES } from '@/lib/calculate-value-score'
import { listGrapeVarieties } from '@/lib/grape-varieties'
import { vivinoToStarRating } from '@/lib/ratings/vivino-star-rating'
import type { WineRow } from '@/components/wine-table'

export type WishlistFilterValue = 'unset' | 0 | 1
export type TriedStatusFilterValue = 'unset' | 1 | 2

export type WineFilters = {
  priceMin: string
  priceMax: string
  /** Site star-rating thresholds (0–5), not raw Vivino scores. */
  vivinoMin: string
  vivinoMax: string
  wishlist: WishlistFilterValue[]
  triedStatus: TriedStatusFilterValue[]
  stores: string[]
  disabledStores: string[]
  hideUnwanted: boolean
  grapes: string[]
  styles: string[]
  producer: string
  country: string
  regions: string[]
  showWishlistOnly: boolean
  showShortlistOnly: boolean
  showThumbsUpOnly: boolean
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
  hideUnwanted: true,
  grapes: [],
  styles: [],
  producer: '',
  country: '',
  regions: [],
  showWishlistOnly: false,
  showShortlistOnly: false,
  showThumbsUpOnly: false,
}

export const BEST_UNDER_PRICE_PRESETS = [1500, 2000, 3000, 4000, 5000] as const

export const HIDE_UNWANTED_WISHLIST_FILTERS: WishlistFilterValue[] = ['unset', 1]
export const HIDE_UNWANTED_TRIED_FILTERS: TriedStatusFilterValue[] = ['unset', 1]

export const WISHLIST_FILTER_LABELS: Record<WishlistFilterValue, string> = {
  unset: 'Not set',
  0: "Don't want",
  1: 'Bookmarked',
}

export const TRIED_STATUS_FILTER_LABELS: Record<TriedStatusFilterValue, string> = {
  unset: 'Not tried',
  1: 'Liked',
  2: 'Disliked',
}

const WISHLIST_FILTER_PREFIX = 'wishlist:'
const TRIED_FILTER_PREFIX = 'tried:'

export function buildReviewFilterGroups(): Array<{
  label: string
  options: Array<{ value: string; label: string }>
}> {
  const wishlistOptions = (['unset', 0, 1] as WishlistFilterValue[]).map((value) => ({
    value: `${WISHLIST_FILTER_PREFIX}${value}`,
    label: WISHLIST_FILTER_LABELS[value],
  }))
  const triedOptions = (['unset', 1, 2] as TriedStatusFilterValue[]).map((value) => ({
    value: `${TRIED_FILTER_PREFIX}${value}`,
    label: TRIED_STATUS_FILTER_LABELS[value],
  }))

  return [
    { label: 'Bookmark', options: wishlistOptions },
    { label: 'Tried', options: triedOptions },
  ]
}

export function encodeReviewFilterSelection(
  wishlist: WishlistFilterValue[],
  triedStatus: TriedStatusFilterValue[],
): string[] {
  return [
    ...wishlist.map((value) => `${WISHLIST_FILTER_PREFIX}${value}`),
    ...triedStatus.map((value) => `${TRIED_FILTER_PREFIX}${value}`),
  ]
}

export function decodeReviewFilterSelection(selected: string[]): {
  wishlist: WishlistFilterValue[]
  triedStatus: TriedStatusFilterValue[]
} {
  const wishlist: WishlistFilterValue[] = []
  const triedStatus: TriedStatusFilterValue[] = []

  for (const value of selected) {
    if (value.startsWith(WISHLIST_FILTER_PREFIX)) {
      const raw = value.slice(WISHLIST_FILTER_PREFIX.length)
      if (raw === 'unset' || raw === '0' || raw === '1') {
        wishlist.push(raw === 'unset' ? 'unset' : (Number(raw) as 0 | 1))
      }
    } else if (value.startsWith(TRIED_FILTER_PREFIX)) {
      const raw = value.slice(TRIED_FILTER_PREFIX.length)
      if (raw === 'unset' || raw === '1' || raw === '2') {
        triedStatus.push(raw === 'unset' ? 'unset' : (Number(raw) as 1 | 2))
      }
    }
  }

  return { wishlist, triedStatus }
}

function filterArraysEqual<T>(left: T[], right: T[]): boolean {
  if (left.length !== right.length) return false
  const leftSorted = [...left].sort()
  const rightSorted = [...right].sort()
  return leftSorted.every((value, index) => value === rightSorted[index])
}

export function isHideUnwantedPreset(filters: WineFilters): boolean {
  return (
    filters.hideUnwanted &&
    filterArraysEqual(filters.wishlist, HIDE_UNWANTED_WISHLIST_FILTERS) &&
    filterArraysEqual(filters.triedStatus, HIDE_UNWANTED_TRIED_FILTERS)
  )
}

export function applyHideUnwantedToggle(filters: WineFilters, enable: boolean): WineFilters {
  if (enable) {
    return {
      ...filters,
      hideUnwanted: true,
      wishlist: [...HIDE_UNWANTED_WISHLIST_FILTERS],
      triedStatus: [...HIDE_UNWANTED_TRIED_FILTERS],
    }
  }

  return {
    ...filters,
    hideUnwanted: false,
    wishlist: [],
    triedStatus: [],
  }
}

export function selectedCountriesFromRegionFilters(regions: string[]): string[] {
  return regions
    .map((value) => parseRegionFilterValue(value))
    .filter((parsed): parsed is { kind: 'country'; country: string } => parsed?.kind === 'country')
    .map((parsed) => parsed.country)
}

export function countryFiltersFromSelection(countries: string[]): string[] {
  return countries.map((country) => countryFilterValue(country))
}

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
  if (value != null && value >= 1) return 1
  if (value === 0) return 0
  return 'unset'
}

function normalizeTriedStatus(value: number | null | undefined): TriedStatusFilterValue {
  if (value === 1) return 1
  if (value === 2 || value === 3) return 2
  return 'unset'
}

export type RegionFilterGroup = {
  country: string
  regions: string[]
}

const COUNTRY_FILTER_PREFIX = 'country:'
const REGION_FILTER_PREFIX = 'region:'

export function countryFilterValue(country: string): string {
  return `${COUNTRY_FILTER_PREFIX}${country}`
}

export function regionFilterValue(country: string, region: string): string {
  return `${REGION_FILTER_PREFIX}${country}|${region}`
}

export function parseRegionFilterValue(
  value: string,
): { kind: 'country'; country: string } | { kind: 'region'; country: string; region: string } | null {
  if (value.startsWith(COUNTRY_FILTER_PREFIX)) {
    return { kind: 'country', country: value.slice(COUNTRY_FILTER_PREFIX.length) }
  }
  if (value.startsWith(REGION_FILTER_PREFIX)) {
    const rest = value.slice(REGION_FILTER_PREFIX.length)
    const separator = rest.indexOf('|')
    if (separator === -1) return null
    const country = rest.slice(0, separator)
    const region = rest.slice(separator + 1)
    if (!country || !region) return null
    return { kind: 'region', country, region }
  }
  return null
}

export function formatRegionFilterLabel(value: string): string {
  const parsed = parseRegionFilterValue(value)
  if (!parsed) return value
  if (parsed.kind === 'country') return parsed.country
  return parsed.region
}

function wineMatchesRegionFilters(wine: WineRow, selected: string[]): boolean {
  const wineCountry = wine.country?.trim() ?? ''
  const wineRegion = wine.region?.trim() ?? ''

  return selected.some((value) => {
    const parsed = parseRegionFilterValue(value)
    if (!parsed) return false
    if (parsed.kind === 'country') return wineCountry === parsed.country
    return wineCountry === parsed.country && wineRegion === parsed.region
  })
}

export function buildRegionFilterGroups(
  regionGroups: RegionFilterGroup[],
): Array<{ label: string; options: Array<{ value: string; label: string }> }> {
  return regionGroups.map((group) => ({
    label: group.country,
    options: [
      { value: countryFilterValue(group.country), label: group.country },
      ...group.regions.map((region) => ({
        value: regionFilterValue(group.country, region),
        label: region,
      })),
    ],
  }))
}

export function collectRegionGroups(wines: WineRow[]): RegionFilterGroup[] {
  const map = new Map<string, Set<string>>()

  for (const wine of wines) {
    const country = wine.country?.trim()
    if (!country) continue
    if (!map.has(country)) map.set(country, new Set())
    const region = wine.region?.trim()
    if (region) map.get(country)!.add(region)
  }

  const sortAlpha = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

  return [...map.entries()]
    .sort(([a], [b]) => sortAlpha(a, b))
    .map(([country, regions]) => ({
      country,
      regions: [...regions].sort(sortAlpha),
    }))
}

export function collectFilterOptions(wines: WineRow[]) {
  const stores = new Set<string>()
  const producers = new Set<string>()
  const countries = new Set<string>()
  const regions = new Set<string>()
  const grapes = new Set<string>()
  const styles = new Set<string>()

  for (const wine of wines) {
    const producer = wine.producer?.trim()
    if (producer) producers.add(producer)

    const country = wine.country?.trim()
    if (country) countries.add(country)

    const region = wine.region?.trim()
    if (region) regions.add(region)

    const style = wine.style?.trim()
    if (style) styles.add(style)

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
    styles: [...styles].sort(sortAlpha),
    regionGroups: collectRegionGroups(wines),
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
  if (filters.styles.length > 0) count += 1
  if (filters.producer.trim()) count += 1
  if (filters.country.trim()) count += 1
  if (filters.regions.length > 0) count += 1
  if (filters.hideUnwanted) count += 1
  if (filters.disabledStores.length > 0) count += 1
  if (filters.showWishlistOnly) count += 1
  if (filters.showShortlistOnly) count += 1
  if (filters.showThumbsUpOnly) count += 1
  return count
}

export function filterWines<T extends WineRow>(wines: T[], filters: WineFilters): T[] {
  const priceMin = parseBound(filters.priceMin)
  const priceMax = parseBound(filters.priceMax)
  const vivinoMin = parseBound(filters.vivinoMin)
  const vivinoMax = parseBound(filters.vivinoMax)
  const producerFilter = filters.producer.trim()
  const countryFilter = filters.country.trim()
  const selectedGrapes = filters.grapes.map((grape) => grape.toLowerCase())
  const selectedStyles = filters.styles.map((style) => style.toLowerCase())

  const hasMyWinesFilter = filters.showWishlistOnly || filters.showShortlistOnly || filters.showThumbsUpOnly

  return wines.filter((wine) => {
    if (hasMyWinesFilter) {
      const matchesAny =
        (filters.showWishlistOnly && normalizeWishlist(wine.review?.wishlist) === 1) ||
        (filters.showShortlistOnly && wine.review?.shortlist === 1) ||
        (filters.showThumbsUpOnly && normalizeTriedStatus(wine.review?.tried_status) === 1)
      if (!matchesAny) return false
    }

    const price = minWinePriceKES(wine.store_listings)
    if (priceMin != null && (price == null || price < priceMin)) return false
    if (priceMax != null && (price == null || price > priceMax)) return false

    // vivinoMin/Max store site star-rating thresholds (frontend mapping from Vivino)
    const starRating = vivinoToStarRating(ratingNum(wine.vivino_rating))
    if (vivinoMin != null && (starRating == null || starRating < vivinoMin)) return false
    if (vivinoMax != null && (starRating == null || starRating > vivinoMax)) return false

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
      if (wine.review?.wishlist === 0 || wine.review?.tried_status === 2 || wine.review?.tried_status === 3 || wine.review?.hide === true) return false
    }

    if (selectedGrapes.length > 0) {
      const wineGrapes = new Set(
        listGrapeVarieties(wine.grape_varieties).map((grape) => grape.toLowerCase()),
      )
      if (!selectedGrapes.some((grape) => wineGrapes.has(grape))) return false
    }

    if (selectedStyles.length > 0) {
      const wineStyle = wine.style?.trim().toLowerCase() ?? ''
      if (!wineStyle || !selectedStyles.includes(wineStyle)) return false
    }

    if (producerFilter && (wine.producer?.trim() ?? '') !== producerFilter) return false
    if (countryFilter && (wine.country?.trim() ?? '') !== countryFilter) return false
    if (filters.regions.length > 0) {
      if (!wineMatchesRegionFilters(wine, filters.regions)) return false
    }

    return true
  })
}
