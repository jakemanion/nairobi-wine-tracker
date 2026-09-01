import type { SortCriterion, SortFieldKey } from '@/components/wine-filter-panel'
import type { WineFilters } from '@/lib/wine-filters'
import { formatRegionFilterLabel } from '@/lib/wine-filters'

const SORT_LABELS: Record<SortFieldKey, string> = {
  winery: 'Producer',
  wine_name: 'Wine name',
  vintage: 'Vintage',
  country: 'Country',
  region: 'Region',
  grapes: 'Grapes',
  style: 'Style',
  vivino_rating: 'Star rating',
  value_score: 'Value score',
  store_prices: 'Store price',
  my_rating: 'My rating',
  wishlist: 'Wishlist',
  tried_status: 'Tried',
  notes: 'Notes',
}

const WISHLIST_LABELS: Record<string, string> = {
  unset: 'Not set',
  '0': "Don't want",
  '1': 'Want',
  '2': 'Expensive treat',
  '3': 'Very expensive treat',
}

const TRIED_LABELS: Record<string, string> = {
  unset: 'Not tried',
  '0': 'Tried',
  '1': 'Buy again',
  '2': "Don't buy again",
}

function sortLabel(key: SortCriterion['key']): string {
  if (key === 'none') return 'None'
  return SORT_LABELS[key]
}

function dirLabel(dir: SortCriterion['dir']): string {
  return dir === 'asc' ? 'ascending' : 'descending'
}

export function buildListStateSummary({
  filters,
  searchQuery,
  primarySort,
  secondarySort,
  resultCount,
  totalCount,
}: {
  filters: WineFilters
  searchQuery: string
  primarySort: SortCriterion
  secondarySort: SortCriterion
  resultCount: number
  totalCount: number
}): string {
  const parts: string[] = []

  parts.push(
    resultCount === totalCount
      ? `Showing all ${resultCount} wines`
      : `Showing ${resultCount} of ${totalCount} wines`,
  )

  const trimmedSearch = searchQuery.trim()
  if (trimmedSearch) {
    parts.push(`Search: “${trimmedSearch}”`)
  }

  const filterParts: string[] = []
  if (filters.priceMin.trim()) filterParts.push(`price from ${filters.priceMin}`)
  if (filters.priceMax.trim()) filterParts.push(`price up to ${filters.priceMax}`)
  if (filters.vivinoMin.trim()) filterParts.push(`Rating from ${filters.vivinoMin}★`)
  if (filters.vivinoMax.trim()) filterParts.push(`Rating up to ${filters.vivinoMax}★`)
  if (filters.producer.trim()) filterParts.push(`producer: ${filters.producer}`)
  if (filters.country.trim()) filterParts.push(`country: ${filters.country}`)
  if (filters.regions.length > 0) {
    filterParts.push(
      `regions: ${filters.regions.map((value) => formatRegionFilterLabel(value)).join(', ')}`,
    )
  }
  if (filters.grapes.length > 0) filterParts.push(`grapes: ${filters.grapes.join(', ')}`)
  if (filters.styles.length > 0) filterParts.push(`type: ${filters.styles.join(', ')}`)
  if (filters.stores.length > 0) filterParts.push(`stores: ${filters.stores.join(', ')}`)
  if (filters.wishlist.length > 0) {
    filterParts.push(
      `wishlist: ${filters.wishlist.map((v) => WISHLIST_LABELS[String(v)]).join(', ')}`,
    )
  }
  if (filters.triedStatus.length > 0) {
    filterParts.push(
      `tried: ${filters.triedStatus.map((v) => TRIED_LABELS[String(v)]).join(', ')}`,
    )
  }
  if (filters.hideUnwanted) filterParts.push('hiding unwanted')
  if (filters.disabledStores.length > 0) {
    filterParts.push(`shops hidden: ${filters.disabledStores.join(', ')}`)
  }

  if (filterParts.length > 0) {
    parts.push(`Filters: ${filterParts.join('; ')}`)
  } else {
    parts.push('Filters: none')
  }

  const sortParts = [`${sortLabel(primarySort.key)} (${dirLabel(primarySort.dir)})`]
  if (secondarySort.key !== 'none') {
    sortParts.push(`${sortLabel(secondarySort.key)} (${dirLabel(secondarySort.dir)})`)
  }
  parts.push(
    secondarySort.key !== 'none'
      ? `Sort: ${sortParts[0]}, then ${sortParts[1]}`
      : `Sort: ${sortParts[0]}`,
  )

  return parts.join(' · ')
}
