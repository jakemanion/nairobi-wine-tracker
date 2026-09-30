import {
  countryFilterValue,
  selectedCountriesFromRegionFilters,
  type WineFilters,
} from '@/lib/wine-filters'

const GRAPE_FILTER_NONE = '__none__'
const COUNTRY_FILTER_NONE = '__none__'

function formatKsh(value: string): string {
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return value
  return `${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })} KSh`
}

function countOrAll(selectedCount: number, totalCount: number, isAll: boolean): string {
  if (isAll || (totalCount > 0 && selectedCount === totalCount)) return 'All'
  return String(selectedCount)
}

function typeSummary(filters: WineFilters): string {
  if (filters.styles.length === 0) return 'All'
  if (filters.styles.includes('__none__')) return 'none'
  return filters.styles.join(', ')
}

function shopsSummary(filters: WineFilters, storeCount: number): string {
  const isAll = filters.disabledStores.length === 0
  const selectedCount = isAll
    ? storeCount
    : Math.max(0, storeCount - filters.disabledStores.length)
  return countOrAll(selectedCount, storeCount, isAll)
}

function grapesSummary(filters: WineFilters, grapeCount: number): string {
  if (filters.grapes.length === 0) return 'All'
  if (filters.grapes.includes(GRAPE_FILTER_NONE)) return '0'
  return countOrAll(filters.grapes.length, grapeCount, false)
}

function countriesSummary(filters: WineFilters, countryCount: number): string {
  if (filters.regions.length === 0) return 'All'
  if (filters.regions.includes(countryFilterValue(COUNTRY_FILTER_NONE))) return '0'
  const selected = selectedCountriesFromRegionFilters(filters.regions)
  return countOrAll(selected.length, countryCount, false)
}

function myWinesSummary(filters: WineFilters): string {
  const on: string[] = []
  if (filters.includeUnmarked) on.push('Unmarked')
  if (filters.includeBookmarked) on.push('Bookmarked')
  if (filters.includeBuyAgain) on.push('Buy Again')
  if (filters.includeDontBuyAgain) on.push("Don't buy again")
  if (filters.includeHidden) on.push('hidden')
  return on.length > 0 ? on.join(', ') : 'none'
}

export function buildListStateSummaryParts({
  filters,
  resultCount,
  storeCount = 0,
  grapeCount = 0,
  countryCount = 0,
  includeMyWines = false,
}: {
  filters: WineFilters
  resultCount: number
  storeCount?: number
  grapeCount?: number
  countryCount?: number
  includeMyWines?: boolean
}): string[] {
  const parts: string[] = [
    `Showing ${resultCount} bottle${resultCount === 1 ? '' : 's'}`,
    `Type: ${typeSummary(filters)}`,
    `Shops: ${shopsSummary(filters, storeCount)}`,
  ]

  const priceMax = filters.priceMax.trim()
  if (priceMax) {
    parts.push(`Under: ${formatKsh(priceMax)}`)
  }

  parts.push(
    `Grapes: ${grapesSummary(filters, grapeCount)}`,
    `Countries: ${countriesSummary(filters, countryCount)}`,
  )

  if (includeMyWines) {
    parts.push(`Showing my wines: ${myWinesSummary(filters)}`)
  }

  return parts
}

export function buildListStateSummary(
  args: Parameters<typeof buildListStateSummaryParts>[0],
): string {
  return buildListStateSummaryParts(args).join(' … ')
}
