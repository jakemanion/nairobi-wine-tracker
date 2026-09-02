import type { SortCriterion, SortFieldKey } from '@/components/wine-filter-panel'
import type { WineFilters } from '@/lib/wine-filters'
import {
  parseRegionFilterValue,
  selectedCountriesFromRegionFilters,
} from '@/lib/wine-filters'

const SORT_LABELS: Record<SortFieldKey, string> = {
  winery: 'Producer',
  wine_name: 'Name',
  vintage: 'Vintage',
  country: 'Country',
  region: 'Region',
  grapes: 'Grapes',
  style: 'Style',
  vivino_rating: 'Rating',
  value_score: 'Value',
  store_prices: 'Price',
  my_rating: 'My rating',
  wishlist: 'Bookmark',
  tried_status: 'Tried',
  notes: 'Notes',
}

const WISHLIST_LABELS: Record<string, string> = {
  unset: 'Not set',
  '0': "Don't want",
  '1': 'Bookmarked',
}

const TRIED_LABELS: Record<string, string> = {
  unset: 'Not tried',
  '1': 'Buy again',
  '2': 'Not again',
}

function sortArrow(dir: SortCriterion['dir']): string {
  return dir === 'asc' ? '↑' : '↓'
}

function formatKsh(value: string): string {
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return value
  return `${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })} KSh`
}

function joinList(values: string[]): string {
  return values.join(', ')
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
      ? `${resultCount} Wines`
      : `${resultCount} of ${totalCount} Wines`,
  )

  const trimmedSearch = searchQuery.trim()
  if (trimmedSearch) {
    parts.push(`Search “${trimmedSearch}”`)
  }

  if (filters.styles.length > 0) {
    parts.push(`Type ${joinList(filters.styles)}`)
  }

  if (filters.grapes.length > 0) {
    parts.push(`Grapes ${joinList(filters.grapes)}`)
  }

  const countries = selectedCountriesFromRegionFilters(filters.regions)
  if (countries.length > 0) {
    parts.push(`Countries ${joinList(countries)}`)
  }

  const regions = filters.regions
    .map((value) => parseRegionFilterValue(value))
    .filter((parsed): parsed is { kind: 'region'; country: string; region: string } => parsed?.kind === 'region')
    .map((parsed) => parsed.region)
  if (regions.length > 0) {
    parts.push(`Regions ${joinList(regions)}`)
  }

  if (filters.priceMin.trim()) {
    parts.push(`≥${formatKsh(filters.priceMin)}`)
  }
  if (filters.priceMax.trim()) {
    parts.push(`≤${formatKsh(filters.priceMax)}`)
  }

  if (filters.vivinoMin.trim()) {
    parts.push(`≥${filters.vivinoMin}★`)
  }
  if (filters.vivinoMax.trim()) {
    parts.push(`≤${filters.vivinoMax}★`)
  }

  if (filters.producer.trim()) {
    parts.push(`Producer ${filters.producer}`)
  }
  if (filters.country.trim()) {
    parts.push(`Country ${filters.country}`)
  }

  if (filters.stores.length > 0) {
    parts.push(`Stores ${joinList(filters.stores)}`)
  }

  if (filters.disabledStores.length > 0) {
    parts.push(`Hide shops ${joinList(filters.disabledStores)}`)
  }

  if (filters.showWishlistOnly) {
    parts.push('Bookmark only')
  }
  if (filters.showShortlistOnly) {
    parts.push('Shortlist only')
  }
  if (filters.showThumbsUpOnly) {
    parts.push('Buy again only')
  }

  if (filters.wishlist.length > 0) {
    parts.push(
      `Bookmark ${filters.wishlist.map((v) => WISHLIST_LABELS[String(v)]).join(', ')}`,
    )
  }

  if (filters.triedStatus.length > 0) {
    parts.push(
      `Tried ${filters.triedStatus.map((v) => TRIED_LABELS[String(v)]).join(', ')}`,
    )
  }

  if (filters.hideUnwanted) {
    parts.push('Hide unwanted')
  }

  const primaryLabel = primarySort.key === 'none' ? 'None' : SORT_LABELS[primarySort.key]
  if (secondarySort.key !== 'none') {
    const secondaryLabel = SORT_LABELS[secondarySort.key]
    parts.push(
      `Sort ${primaryLabel} ${sortArrow(primarySort.dir)}, then ${secondaryLabel} ${sortArrow(secondarySort.dir)}`,
    )
  } else {
    parts.push(`Sort ${primaryLabel} ${sortArrow(primarySort.dir)}`)
  }

  return parts.join(' · ')
}
