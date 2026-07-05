'use client'

import type { CSSProperties } from 'react'
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

const SLIDER_WIDTH = '5.625rem'

function chipStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    padding: '4px 8px',
    fontSize: 11,
    lineHeight: 1.2,
    borderRadius: 6,
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
    fontSize: 11,
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
const PRICE_SLIDER_STEPS = 1000
const MEDIAN_SLIDER_POSITION = Math.round((2 / 3) * PRICE_SLIDER_STEPS)

const RATING_SLIDER_STEPS = 100
const RATING_LOW_MAX = 3.5
const RATING_HIGH_MAX = 5
const RATING_LOW_SLIDER_POSITION = 30

const QUICK_SORT_OPTIONS: Array<{ key: SortFieldKey; label: string; dir: 'asc' | 'desc' }> = [
  { key: 'winery', label: 'Producer', dir: 'asc' },
  { key: 'wine_name', label: 'Name', dir: 'asc' },
  { key: 'store_prices', label: 'Price', dir: 'asc' },
  { key: 'value_score', label: 'Value', dir: 'desc' },
  { key: 'vivino_rating', label: 'Rating', dir: 'desc' },
]

function isQuickSortActive(
  primarySort: SortCriterion,
  key: SortFieldKey,
  dir: 'asc' | 'desc',
): boolean {
  return primarySort.key === key && primarySort.dir === dir
}

function sliderValueStyle(colors: PreviewColors): CSSProperties {
  return {
    fontSize: 11,
    color: colors.searchText,
    fontFamily: 'var(--font-dm-sans), sans-serif',
    minWidth: 32,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  }
}

function logPrice(value: number): number {
  return Math.log10(Math.max(value, 100))
}

function interpolateLogPrice(low: number, high: number, t: number): number {
  const logLow = logPrice(low)
  const logHigh = logPrice(high)
  return Math.pow(10, logLow + t * (logHigh - logLow))
}

function inverseLogT(price: number, low: number, high: number): number {
  const logLow = logPrice(low)
  const logHigh = logPrice(high)
  const logPriceValue = logPrice(price)
  if (logHigh === logLow) return 0
  return (logPriceValue - logLow) / (logHigh - logLow)
}

function maxPriceToSliderPosition(
  priceMax: string,
  min: number,
  median: number,
  max: number,
): number {
  if (!priceMax.trim()) return PRICE_SLIDER_STEPS
  const price = parseFloat(priceMax)
  if (!Number.isFinite(price)) return PRICE_SLIDER_STEPS

  if (price <= median) {
    const t = inverseLogT(price, min, median)
    return Math.round(Math.min(1, Math.max(0, t)) * MEDIAN_SLIDER_POSITION)
  }

  const t = inverseLogT(price, median, max)
  return Math.round(
    MEDIAN_SLIDER_POSITION + Math.min(1, Math.max(0, t)) * (PRICE_SLIDER_STEPS - MEDIAN_SLIDER_POSITION),
  )
}

function sliderPositionToMaxPrice(
  position: number,
  min: number,
  median: number,
  max: number,
): number | null {
  if (position >= PRICE_SLIDER_STEPS) return null

  if (position <= MEDIAN_SLIDER_POSITION) {
    const t = MEDIAN_SLIDER_POSITION === 0 ? 0 : position / MEDIAN_SLIDER_POSITION
    const raw = interpolateLogPrice(min, median, t)
    return Math.max(min, Math.round(raw / 100) * 100)
  }

  const span = PRICE_SLIDER_STEPS - MEDIAN_SLIDER_POSITION
  const t = span === 0 ? 1 : (position - MEDIAN_SLIDER_POSITION) / span
  const raw = interpolateLogPrice(median, max, t)
  return Math.max(median, Math.round(raw / 100) * 100)
}

function ratingToSliderPosition(rating: number): number {
  if (rating <= RATING_LOW_MAX) {
    const t = rating / RATING_LOW_MAX
    return Math.round(Math.min(1, Math.max(0, t)) * RATING_LOW_SLIDER_POSITION)
  }

  const t = (rating - RATING_LOW_MAX) / (RATING_HIGH_MAX - RATING_LOW_MAX)
  return Math.round(
    RATING_LOW_SLIDER_POSITION +
      Math.min(1, Math.max(0, t)) * (RATING_SLIDER_STEPS - RATING_LOW_SLIDER_POSITION),
  )
}

function sliderPositionToRating(position: number): number {
  if (position <= RATING_LOW_SLIDER_POSITION) {
    const t = position / RATING_LOW_SLIDER_POSITION
    return Math.min(RATING_LOW_MAX, Math.max(0, t * RATING_LOW_MAX))
  }

  const span = RATING_SLIDER_STEPS - RATING_LOW_SLIDER_POSITION
  const t = span === 0 ? 1 : (position - RATING_LOW_SLIDER_POSITION) / span
  return RATING_LOW_MAX + t * (RATING_HIGH_MAX - RATING_LOW_MAX)
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
  const priceMinBound = priceBounds?.min ?? 100
  const priceMedianBound = priceBounds?.median ?? 2000
  const priceMaxBound = priceBounds?.max ?? 10000
  const priceMaxValue = filters.priceMax.trim()
    ? Math.min(parseFloat(filters.priceMax), priceMaxBound)
    : priceMaxBound
  const priceMaxAll = !filters.priceMax.trim() || priceMaxValue >= priceMaxBound
  const priceSliderPosition = maxPriceToSliderPosition(
    filters.priceMax,
    priceMinBound,
    priceMedianBound,
    priceMaxBound,
  )

  const vivinoMinValue = filters.vivinoMin.trim() ? parseFloat(filters.vivinoMin) : 0
  const vivinoMinAll = !filters.vivinoMin.trim() || vivinoMinValue <= 0
  const ratingSliderPosition = vivinoMinAll ? 0 : ratingToSliderPosition(vivinoMinValue)

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
        <span style={sliderLabelStyle(colors)}>Sort</span>
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span style={sliderLabelStyle(colors)}>Filters:</span>
        <label className="flex-none" style={sliderGroupStyle(colors)}>
          <span style={sliderLabelStyle(colors)}>Highest price</span>
          <input
            type="range"
            min={0}
            max={PRICE_SLIDER_STEPS}
            step={1}
            value={priceSliderPosition}
            aria-label="Highest price"
            className="flex-none accent-[#C93048]"
            style={{ width: SLIDER_WIDTH }}
            onChange={(event) => {
              const nextPrice = sliderPositionToMaxPrice(
                Number(event.target.value),
                priceMinBound,
                priceMedianBound,
                priceMaxBound,
              )
              updateFilters({ priceMax: nextPrice == null ? '' : String(nextPrice) })
            }}
          />
          <span style={sliderValueStyle(colors)}>
            {priceMaxAll ? 'All' : Math.round(priceMaxValue).toLocaleString()}
          </span>
        </label>

        <label className="flex-none" style={sliderGroupStyle(colors)}>
          <span style={sliderLabelStyle(colors)}>Lowest rating</span>
          <input
            type="range"
            min={0}
            max={RATING_SLIDER_STEPS}
            step={1}
            value={ratingSliderPosition}
            aria-label="Lowest rating"
            className="flex-none accent-[#C93048]"
            style={{ width: SLIDER_WIDTH }}
            onChange={(event) => {
              const next = sliderPositionToRating(Number(event.target.value))
              if (next <= 0) {
                updateFilters({ vivinoMin: '' })
                return
              }
              updateFilters({ vivinoMin: next.toFixed(1) })
            }}
          />
          <span style={sliderValueStyle(colors)}>
            {vivinoMinAll ? 'Any' : vivinoMinValue.toFixed(1)}
          </span>
        </label>

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
          label="Reviews"
          emptyMessage="No review options"
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
