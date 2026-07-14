'use client'

import type { CSSProperties } from 'react'
import { ArrowUpDown } from 'lucide-react'
import {
  BEST_UNDER_PRICE_PRESETS,
  buildReviewFilterGroups,
  countryFiltersFromSelection,
  decodeReviewFilterSelection,
  encodeReviewFilterSelection,
  selectedCountriesFromRegionFilters,
  type WineFilters,
} from '@/lib/wine-filters'
import { PreviewFilterMultiSelect } from '@/components/preview/preview-filter-multi-select'
import { UsageTipTarget } from '@/components/preview/usage-tip-target'
import type { PreviewColors } from '@/lib/preview/preview-colors'
import type { SortCriterion, SortFieldKey } from '@/components/wine-filter-panel'

type PriceBounds = {
  min: number
  max: number
  median: number
}

type PreviewToolbarQuickFiltersProps = {
  colors: PreviewColors
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  stores: string[]
  grapes: string[]
  countries: string[]
  priceBounds: PriceBounds | null
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
}

function chipStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    padding: '6px 10px',
    fontSize: 12,
    lineHeight: 1.2,
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? colors.searchBg : colors.buttonBg,
    border: `1px solid ${active ? '#C93048' : colors.buttonBorder}`,
    color: active ? colors.searchText : colors.buttonText,
    whiteSpace: 'nowrap',
  }
}

function sliderLabelStyle(colors: PreviewColors): CSSProperties {
  return {
    fontSize: 12,
    color: colors.muted,
    fontFamily: 'var(--font-dm-sans), sans-serif',
    whiteSpace: 'nowrap',
  }
}

function sliderGroupStyle(colors: PreviewColors): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 6,
    background: colors.searchBg,
    border: `1px solid ${colors.searchBorder}`,
  }
}

function toggleStore(disabledStores: string[], store: string): string[] {
  return disabledStores.includes(store)
    ? disabledStores.filter((name) => name !== store)
    : [...disabledStores, store]
}

function isBestUnderActive(filters: WineFilters, primarySort: SortCriterion, price: number): boolean {
  return (
    filters.priceMax.trim() === String(price) &&
    primarySort.key === 'vivino_rating' &&
    primarySort.dir === 'desc'
  )
}

const PRODUCER_SORT: SortCriterion = { key: 'winery', dir: 'asc' }

const QUICK_SORT_OPTIONS: Array<{ key: SortFieldKey; label: string; dir: 'asc' | 'desc' }> = [
  { key: 'value_score', label: 'Value', dir: 'desc' },
  { key: 'winery', label: 'Producer', dir: 'asc' },
  { key: 'wine_name', label: 'Name', dir: 'asc' },
  { key: 'store_prices', label: 'Price', dir: 'asc' },
  { key: 'vivino_rating', label: 'Rating', dir: 'desc' },
]

function isQuickSortActive(
  primarySort: SortCriterion,
  key: SortFieldKey,
  dir: 'asc' | 'desc',
): boolean {
  return primarySort.key === key && primarySort.dir === dir
}

function filterSelectStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    fontSize: 12,
    lineHeight: 1.2,
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? colors.searchBg : colors.buttonBg,
    border: `1px solid ${active ? '#C93048' : colors.buttonBorder}`,
    color: active ? colors.searchText : colors.buttonText,
    whiteSpace: 'nowrap' as const,
  }
}

function buildPriceOptions(maxBound: number): number[] {
  const options: number[] = []
  let price = 1000
  while (price <= 3000 && price <= maxBound) {
    options.push(price)
    price += 250
  }
  while (price <= 6000 && price <= maxBound) {
    options.push(price)
    price += 500
  }
  while (price <= 10000 && price <= maxBound) {
    options.push(price)
    price += 1000
  }
  while (price <= maxBound) {
    options.push(price)
    price += 5000
  }
  if (options.length > 0 && options[options.length - 1] < maxBound) {
    options.push(maxBound)
  }
  return options
}

function buildRatingOptions(): string[] {
  const options: string[] = []
  for (let r = 3.0; r <= 5.0; r = Math.round((r + 0.1) * 10) / 10) {
    options.push(r.toFixed(1))
  }
  return options
}

export function PreviewToolbarQuickFilters({
  colors,
  filters,
  onFiltersChange,
  stores,
  grapes,
  countries,
  priceBounds,
  primarySort,
  onPrimarySortChange,
  onSecondarySortChange,
}: PreviewToolbarQuickFiltersProps) {
  const priceMaxBound = priceBounds?.max ?? 10000

  const reviewFilterSelection = encodeReviewFilterSelection(filters.wishlist, filters.triedStatus)
  const selectedCountries = selectedCountriesFromRegionFilters(filters.regions)

  function updateFilters(patch: Partial<WineFilters>) {
    onFiltersChange({ ...filters, ...patch })
  }

  function applyQuickSort(key: SortFieldKey, dir: 'asc' | 'desc') {
    if (isQuickSortActive(primarySort, key, dir)) {
      onPrimarySortChange(PRODUCER_SORT)
      onSecondarySortChange({ key: 'none', dir: 'asc' })
      return
    }
    onPrimarySortChange({ key, dir })
    onSecondarySortChange({ key: 'none', dir: 'asc' })
  }

  function applyBestUnder(price: number) {
    if (isBestUnderActive(filters, primarySort, price)) {
      updateFilters({ priceMax: '' })
      return
    }

    updateFilters({ priceMax: String(price) })
    onPrimarySortChange({ key: 'vivino_rating', dir: 'desc' })
    onSecondarySortChange({ key: 'none', dir: 'asc' })
  }

  function updateReviewFilters(selected: string[]) {
    const { wishlist, triedStatus } = decodeReviewFilterSelection(selected)
    updateFilters({
      wishlist,
      triedStatus,
      hideUnwanted: false,
    })
  }

  return (
    <div className="flex flex-col gap-2.5 px-3 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <UsageTipTarget
          tipId="sort-panel"
          className="flex flex-wrap items-center gap-1.5"
          style={sliderGroupStyle(colors)}
        >
          <span style={sliderLabelStyle(colors)}>Sort by:</span>
          {QUICK_SORT_OPTIONS.map((option) => {
            const active = isQuickSortActive(primarySort, option.key, option.dir)
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                style={chipStyle(colors, active)}
                onClick={() => applyQuickSort(option.key, option.dir)}
              >
                {option.label}
              </button>
            )
          })}
          <button
            type="button"
            title="Reverse sort direction"
            aria-label="Reverse sort direction"
            style={{
              ...chipStyle(colors, false),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 8px',
            }}
            onClick={() => {
              const reversed = primarySort.dir === 'asc' ? 'desc' : 'asc'
              onPrimarySortChange({ ...primarySort, dir: reversed })
            }}
          >
            <ArrowUpDown size={13} strokeWidth={2} />
          </button>
        </UsageTipTarget>

        <UsageTipTarget
          tipId="best-under-panel"
          className="flex flex-wrap items-center gap-1.5"
          style={sliderGroupStyle(colors)}
        >
          <span style={sliderLabelStyle(colors)}>Best wines under:</span>
          {BEST_UNDER_PRICE_PRESETS.map((price) => (
            <button
              key={price}
              type="button"
              aria-pressed={isBestUnderActive(filters, primarySort, price)}
              style={chipStyle(colors, isBestUnderActive(filters, primarySort, price))}
              onClick={() => applyBestUnder(price)}
            >
              {price.toLocaleString()}
            </button>
          ))}
        </UsageTipTarget>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span style={sliderLabelStyle(colors)}>Filters:</span>
        <select
          aria-label="Highest price"
          className="flex-none"
          style={filterSelectStyle(colors, !!filters.priceMax.trim())}
          value={filters.priceMax.trim() || ''}
          onChange={(event) => updateFilters({ priceMax: event.target.value })}
        >
          <option value="">Highest price: Show all</option>
          {buildPriceOptions(priceMaxBound).map((price) => (
            <option key={price} value={String(price)}>
              Max price: {price.toLocaleString()} KSh
            </option>
          ))}
        </select>

        <select
          aria-label="Lowest rating"
          className="flex-none"
          style={filterSelectStyle(colors, !!filters.vivinoMin.trim())}
          value={filters.vivinoMin.trim() || ''}
          onChange={(event) => updateFilters({ vivinoMin: event.target.value })}
        >
          <option value="">Lowest rating: Show all</option>
          {buildRatingOptions().map((rating) => (
            <option key={rating} value={rating}>
              {rating} and above
            </option>
          ))}
        </select>

        <PreviewFilterMultiSelect
          colors={colors}
          label="Grapes"
          emptyMessage="No grapes in list"
          options={grapes}
          selected={filters.grapes}
          onChange={(next) => updateFilters({ grapes: next })}
        />

        <PreviewFilterMultiSelect
          colors={colors}
          label="Countries"
          emptyMessage="No countries in list"
          options={countries}
          selected={selectedCountries}
          onChange={(next) => updateFilters({ regions: countryFiltersFromSelection(next) })}
        />

        <PreviewFilterMultiSelect
          colors={colors}
          label="Wishlists"
          emptyMessage="No wishlist options"
          groups={buildReviewFilterGroups()}
          selected={reviewFilterSelection}
          onChange={updateReviewFilters}
        />
      </div>

      {stores.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span style={sliderLabelStyle(colors)}>Shops:</span>
          {stores.map((store) => {
            const enabled = !filters.disabledStores.includes(store)
            return (
              <button
                key={store}
                type="button"
                aria-pressed={enabled}
                title={enabled ? `Hide ${store}` : `Show ${store}`}
                style={chipStyle(colors, enabled)}
                onClick={() =>
                  updateFilters({
                    disabledStores: toggleStore(filters.disabledStores, store),
                  })
                }
              >
                {store}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
