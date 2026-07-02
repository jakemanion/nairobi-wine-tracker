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
  const priceMaxBound = priceBounds?.max ?? 10000
  const priceMaxValue = filters.priceMax.trim()
    ? Math.min(parseFloat(filters.priceMax), priceMaxBound)
  : priceMaxBound
  const priceMaxAll = !filters.priceMax.trim() || priceMaxValue >= priceMaxBound

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
          aria-pressed={filters.hideUnwanted}
          style={chipStyle(colors, filters.hideUnwanted)}
          onClick={() => updateFilters({ hideUnwanted: !filters.hideUnwanted })}
        >
          {filters.hideUnwanted ? 'Hiding unwanted' : 'Hide unwanted'}
        </button>

        <button
          type="button"
          aria-pressed={valueSortActive}
          style={chipStyle(colors, valueSortActive)}
          onClick={() => {
            onPrimarySortChange({ key: 'value_score', dir: 'desc' })
            onSecondarySortChange({ key: 'none', dir: 'asc' })
          }}
        >
          Sort: value
        </button>

        <button
          type="button"
          aria-pressed={vivinoSortActive}
          style={chipStyle(colors, vivinoSortActive)}
          onClick={() => {
            onPrimarySortChange({ key: 'vivino_rating', dir: 'desc' })
            onSecondarySortChange({ key: 'none', dir: 'asc' })
          }}
        >
          Sort: Vivino
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-2 min-w-[180px] flex-1">
          <span style={sliderLabelStyle(colors)}>
            {priceMaxAll ? 'Max price: All' : `Max price: ${Math.round(priceMaxValue)}`}
          </span>
          <input
            type="range"
            min={priceBounds?.min ?? 0}
            max={priceMaxBound}
            step={100}
            value={priceMaxAll ? priceMaxBound : priceMaxValue}
            aria-label="Maximum price"
            className="flex-1 min-w-[80px] accent-[#C93048]"
            onChange={(event) => {
              const next = Number(event.target.value)
              if (next >= priceMaxBound) {
                updateFilters({ priceMax: '' })
                return
              }
              updateFilters({ priceMax: String(next) })
            }}
          />
        </label>

        <label className="flex items-center gap-2 min-w-[180px] flex-1">
          <span style={sliderLabelStyle(colors)}>
            {vivinoMinAll ? 'Vivino min: Any' : `Vivino min: ${vivinoMinValue.toFixed(1)}`}
          </span>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={vivinoMinAll ? 0 : vivinoMinValue}
            aria-label="Minimum Vivino score"
            className="flex-1 min-w-[80px] accent-[#C93048]"
            onChange={(event) => {
              const next = Number(event.target.value)
              if (next <= 0) {
                updateFilters({ vivinoMin: '' })
                return
              }
              updateFilters({ vivinoMin: next.toFixed(1) })
            }}
          />
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

      <div className="flex flex-wrap items-center gap-1.5">
        <span style={sliderLabelStyle(colors)}>Best under:</span>
        {BEST_UNDER_PRICE_PRESETS.map((price) => (
          <button
            key={price}
            type="button"
            aria-pressed={isBestUnderActive(filters, primarySort, price)}
            style={chipStyle(colors, isBestUnderActive(filters, primarySort, price))}
            onClick={() => applyBestUnder(price)}
          >
            Best under {price.toLocaleString()}
          </button>
        ))}
      </div>
    </div>
  )
}
