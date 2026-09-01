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
  wishlist: 'Wishlist',
  tried_status: 'Tried',
  notes: 'Notes',
}

const WISHLIST_LABELS: Record<string, string> = {
  unset: 'not set',
  '0': "don't want",
  '1': 'wishlisted',
}

const TRIED_LABELS: Record<string, string> = {
  unset: 'not tried',
  '1': 'buy again',
  '2': 'not again',
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
      ? `${resultCount} wines`
      : `${resultCount} of ${totalCount} wines`,
  )

  const trimmedSearch = searchQuery.trim()
  if (trimmedSearch) {
    parts.push(`search “${trimmedSearch}”`)
  }

  if (filters.styles.length > 0) {
    parts.push(`type ${joinList(filters.styles)}`)
  }

  if (filters.grapes.length > 0) {
    parts.push(`grapes ${joinList(filters.grapes)}`)
  }

  const countries = selectedCountriesFromRegionFilters(filters.regions)
  if (countries.length > 0) {
    parts.push(`countries ${joinList(countries)}`)
  }

  const regions = filters.regions
    .map((value) => parseRegionFilterValue(value))
    .filter((parsed): parsed is { kind: 'region'; country: string; region: string } => parsed?.kind === 'region')
    .map((parsed) => parsed.region)
  if (regions.length > 0) {
    parts.push(`regions ${joinList(regions)}`)
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
    parts.push(`producer ${filters.producer}`)
  }
  if (filters.country.trim()) {
    parts.push(`country ${filters.country}`)
  }

  if (filters.stores.length > 0) {
    parts.push(`stores ${joinList(filters.stores)}`)
  }

  if (filters.disabledStores.length > 0) {
    parts.push(`hide shops ${joinList(filters.disabledStores)}`)
  }

  if (filters.showWishlistOnly) {
    parts.push('wishlist only')
  }
  if (filters.showShortlistOnly) {
    parts.push('shortlist only')
  }
  if (filters.showThumbsUpOnly) {
    parts.push('buy again only')
  }

  if (filters.wishlist.length > 0) {
    parts.push(
      `wishlist ${filters.wishlist.map((v) => WISHLIST_LABELS[String(v)]).join(', ')}`,
    )
  }

  if (filters.triedStatus.length > 0) {
    parts.push(
      `tried ${filters.triedStatus.map((v) => TRIED_LABELS[String(v)]).join(', ')}`,
    )
  }

  if (filters.hideUnwanted) {
    parts.push('hide unwanted')
  }

  const primaryLabel = primarySort.key === 'none' ? 'None' : SORT_LABELS[primarySort.key]
  if (secondarySort.key !== 'none') {
    const secondaryLabel = SORT_LABELS[secondarySort.key]
    parts.push(
      `sort ${primaryLabel} ${sortArrow(primarySort.dir)}, then ${secondaryLabel} ${sortArrow(secondarySort.dir)}`,
    )
  } else {
    parts.push(`sort ${primaryLabel} ${sortArrow(primarySort.dir)}`)
  }

  return parts.join(' · ')
}
