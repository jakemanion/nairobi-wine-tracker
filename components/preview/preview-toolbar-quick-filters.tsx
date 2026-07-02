'use client'

import type { CSSProperties } from 'react'
import {
  BEST_UNDER_PRICE_PRESETS,
  type WineFilters,
} from '@/lib/wine-filters'
import type { PreviewColors } from '@/lib/preview/preview-colors'
import type { SortCriterion } from '@/components/wine-filter-panel'

type PreviewToolbarQuickFiltersProps = {
  colors: PreviewColors
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  stores: string[]
  priceBounds: { min: number; max: number } | null
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
}

function chipStyle(
  colors: PreviewColors,
  active: boolean,
): CSSProperties {
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

function toggleStore(
  disabledStores: string[],
  store: string,
): string[] {
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

function priceLogMin(min: number): number {
  return Math.log10(Math.max(min, 100))
}

function priceLogMax(max: number): number {
  return Math.log10(max)
}

function maxPriceToSliderPosition(
  priceMax: string,
  min: number,
  max: number,
): number {
  if (!priceMax.trim()) return PRICE_SLIDER_STEPS
  const price = parseFloat(priceMax)
  if (!Number.isFinite(price)) return PRICE_SLIDER_STEPS

  const logMin = priceLogMin(min)
  const logMax = priceLogMax(max)
  const logPrice = Math.log10(Math.max(price, 100))
  const t = (logPrice - logMin) / (logMax - logMin)
  return Math.round(Math.min(1, Math.max(0, t)) * PRICE_SLIDER_STEPS)
}

function sliderPositionToMaxPrice(
  position: number,
  min: number,
  max: number,
): number | null {
  if (position >= PRICE_SLIDER_STEPS) return null

  const logMin = priceLogMin(min)
  const logMax = priceLogMax(max)
  const t = position / PRICE_SLIDER_STEPS
  const raw = Math.pow(10, logMin + t * (logMax - logMin))
  return Math.max(min, Math.round(raw / 100) * 100)
}

export function PreviewToolbarQuickFilters({
  colors,
  filters,
  onFiltersChange,
  stores,
  priceBounds,
  primarySort,
  onPrimarySortChange,
  onSecondarySortChange,
}: PreviewToolbarQuickFiltersProps) {
  const priceMinBound = priceBounds?.min ?? 100
  const priceMaxBound = priceBounds?.max ?? 10000
  const priceMaxValue = filters.priceMax.trim()
    ? Math.min(parseFloat(filters.priceMax), priceMaxBound)
    : priceMaxBound
  const priceMaxAll = !filters.priceMax.trim() || priceMaxValue >= priceMaxBound
  const priceSliderPosition = maxPriceToSliderPosition(
    filters.priceMax,
    priceMinBound,
    priceMaxBound,
  )

  const vivinoMinValue = filters.vivinoMin.trim() ? parseFloat(filters.vivinoMin) : 0
  const vivinoMinAll = !filters.vivinoMin.trim() || vivinoMinValue <= 0

  const valueSortActive =
    primarySort.key === 'value_score' && primarySort.dir === 'desc'
  const vivinoSortActive =
    primarySort.key === 'vivino_rating' && primarySort.dir === 'desc'

  function updateFilters(patch: Partial<WineFilters>) {
    onFiltersChange({ ...filters, ...patch })
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

  return (
    <div className="flex flex-col gap-2.5 px-3 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={valueSortActive}
          style={chipStyle(colors, valueSortActive)}
          onClick={() => {
            if (valueSortActive) {
              onPrimarySortChange(PRODUCER_SORT)
              onSecondarySortChange({ key: 'none', dir: 'asc' })
              return
            }
            onPrimarySortChange({ key: 'value_score', dir: 'desc' })
            onSecondarySortChange({ key: 'none', dir: 'asc' })
          }}
        >
          Sort by value
        </button>

        <button
          type="button"
          aria-pressed={vivinoSortActive}
          style={chipStyle(colors, vivinoSortActive)}
          onClick={() => {
            if (vivinoSortActive) {
              onPrimarySortChange(PRODUCER_SORT)
              onSecondarySortChange({ key: 'none', dir: 'asc' })
              return
            }
            onPrimarySortChange({ key: 'vivino_rating', dir: 'desc' })
            onSecondarySortChange({ key: 'none', dir: 'asc' })
          }}
        >
          Sort by Rating
        </button>

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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span style={sliderLabelStyle(colors)}>Filters:</span>
        <label className="flex items-center gap-2 flex-none">
          <span style={sliderLabelStyle(colors)}>Highest price</span>
          <input
            type="range"
            min={0}
            max={PRICE_SLIDER_STEPS}
            step={1}
            value={priceSliderPosition}
            aria-label="Highest price"
            className="w-[120px] flex-none accent-[#C93048]"
            onChange={(event) => {
              const nextPrice = sliderPositionToMaxPrice(
                Number(event.target.value),
                priceMinBound,
                priceMaxBound,
              )
              updateFilters({ priceMax: nextPrice == null ? '' : String(nextPrice) })
            }}
          />
          <span style={sliderValueStyle(colors)}>
            {priceMaxAll ? 'All' : Math.round(priceMaxValue).toLocaleString()}
          </span>
        </label>

        <label className="flex items-center gap-2 flex-none">
          <span style={sliderLabelStyle(colors)}>Lowest rating</span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={vivinoMinAll ? 0 : vivinoMinValue}
            aria-label="Lowest rating"
            className="w-[120px] flex-none accent-[#C93048]"
            onChange={(event) => {
              const next = Number(event.target.value)
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
