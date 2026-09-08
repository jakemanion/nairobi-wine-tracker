'use client'

import type { CSSProperties } from 'react'
import { ArrowUpDown, Bookmark, Check, EyeOff, ThumbsUp } from 'lucide-react'
import {
  BEST_UNDER_PRICE_PRESETS,
  countryFiltersFromSelection,
  selectedCountriesFromRegionFilters,
  type WineFilters,
} from '@/lib/wine-filters'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { PreviewFilterMultiSelect } from '@/components/preview/preview-filter-multi-select'
import { UsageTipTarget } from '@/components/preview/usage-tip-target'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import type { PreviewColors } from '@/lib/preview/preview-colors'
import type { SortCriterion, SortFieldKey } from '@/components/wine-filter-panel'
import { formatStarRating, starRatingFilterOptions } from '@/lib/ratings/vivino-star-rating'

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
  styles: string[]
  countries: string[]
  priceBounds: PriceBounds | null
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
  isLoggedIn?: boolean
  showAdvanced?: boolean
}

const CONTROL_HEIGHT = 22
const CONTROL_FONT_SIZE = 10

function chipStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    height: CONTROL_HEIGHT,
    padding: '0 7px',
    fontSize: CONTROL_FONT_SIZE,
    lineHeight: 1.2,
    borderRadius: colors.panelRadius,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? '#ffffff' : colors.buttonBg,
    border: `1px solid ${active ? colors.accent : colors.buttonBorder}`,
    color: active ? colors.summaryStrong : colors.buttonText,
    whiteSpace: 'nowrap',
  }
}

function sliderGroupStyle(colors: PreviewColors): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: colors.panelRadius,
    background: colors.previewShellBg,
    border: `1px solid ${colors.toolbarBorder}`,
    fontFamily: 'var(--font-dm-sans), sans-serif',
  }
}

function titledSectionStyle(colors: PreviewColors): CSSProperties {
  return {
    ...sliderGroupStyle(colors),
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    width: 'fit-content',
    maxWidth: '100%',
  }
}

function sectionTitleStyle(colors: PreviewColors): CSSProperties {
  return {
    margin: 0,
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 600,
    color: colors.accent,
    fontFamily: 'var(--font-dm-sans), sans-serif',
    lineHeight: 1.2,
  }
}

function isBestUnderActive(filters: WineFilters, primarySort: SortCriterion, price: number): boolean {
  return (
    filters.priceMax.trim() === String(price) &&
    primarySort.key === 'vivino_rating' &&
    primarySort.dir === 'desc'
  )
}

function activeBestUnderPrice(filters: WineFilters, primarySort: SortCriterion): string {
  const priceMax = filters.priceMax.trim()
  if (!priceMax) return ''
  const price = Number(priceMax)
  if (!BEST_UNDER_PRICE_PRESETS.includes(price as (typeof BEST_UNDER_PRICE_PRESETS)[number])) {
    return ''
  }
  return isBestUnderActive(filters, primarySort, price) ? priceMax : ''
}

const QUICK_SORT_OPTIONS: Array<{ key: SortFieldKey; label: string; dir: 'asc' | 'desc' }> = [
  { key: 'value_score', label: 'Value', dir: 'desc' },
  { key: 'winery', label: 'Producer', dir: 'asc' },
  { key: 'wine_name', label: 'Name', dir: 'asc' },
  { key: 'store_prices', label: 'Price', dir: 'asc' },
  { key: 'vivino_rating', label: 'Rating', dir: 'desc' },
]

/** Sentinel so an empty Type selection can mean "match nothing" (unlike [] = all types). */
const STYLE_FILTER_NONE = '__none__'


const REVIEW_FILTER_COLORS = {
  wishlist: { bg: '#162010', border: '#2A5030', color: '#50A060' },
  shortlist: { bg: '#101830', border: '#2040A0', color: '#6090E0' },
  thumbsUp: { bg: '#3A2E08', border: '#8A7020', color: '#E0C040' },
  hide: { bg: '#2A1C1C', border: '#5A3030', color: '#F08080' },
} as const

const TRIAL_REVIEW_FILTER_COLORS = {
  wishlist: { bg: '#99E2DA', border: '#029485', color: '#029485' },
  shortlist: { bg: '#F0F0F8', border: '#E4E4EE', color: '#7878A0' },
  thumbsUp: { bg: '#FFDD42', border: '#C89010', color: '#C89010' },
  hide: { bg: '#ffffff', border: '#E4E4EE', color: '#BCBCCE' },
} as const

function reviewFilterButtonStyle(
  colors: PreviewColors,
  active: boolean,
  kind: 'wishlist' | 'shortlist' | 'thumbsUp' | 'hide',
  trial = false,
): CSSProperties {
  const accent = (trial ? TRIAL_REVIEW_FILTER_COLORS : REVIEW_FILTER_COLORS)[kind]
  return {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    padding: 0,
    fontSize: CONTROL_FONT_SIZE,
    lineHeight: 1.2,
    borderRadius: colors.buttonRadius,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? accent.bg : colors.buttonBg,
    border: `1px solid ${active ? accent.border : colors.buttonBorder}`,
    color: active ? accent.color : colors.buttonText,
    whiteSpace: 'nowrap' as const,
  }
}

function ReviewFilterOnTick({ colors }: { colors: PreviewColors }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inline-flex items-center justify-center"
      style={{
        left: -2,
        bottom: -2,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: `0 0 0 1px ${colors.buttonBorder}`,
      }}
    >
      <Check size={10} strokeWidth={2.5} style={{ color: colors.accent }} />
    </span>
  )
}

function filterSelectStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    height: CONTROL_HEIGHT,
    fontSize: CONTROL_FONT_SIZE,
    lineHeight: 1.2,
    padding: '0 1.35rem 0 8px',
    borderRadius: colors.panelRadius,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? '#ffffff' : colors.buttonBg,
    border: `1px solid ${active ? colors.accent : colors.buttonBorder}`,
    color: active ? colors.summaryStrong : colors.buttonText,
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
  return starRatingFilterOptions().map((rating) => formatStarRating(rating))
}

export function PreviewToolbarQuickFilters({
  colors,
  filters,
  onFiltersChange,
  stores,
  grapes,
  styles,
  countries,
  priceBounds,
  primarySort,
  onPrimarySortChange,
  onSecondarySortChange,
  isLoggedIn = false,
  showAdvanced = false,
}: PreviewToolbarQuickFiltersProps) {
  const { visualStyle } = usePreviewTheme()
  const trial = visualStyle === 'trial'
  const priceMaxBound = priceBounds?.max ?? 10000

  const selectedCountries = selectedCountriesFromRegionFilters(filters.regions)
  const allShopsEnabled = filters.disabledStores.length === 0
  const selectedShops = allShopsEnabled
    ? stores
    : stores.filter((store) => !filters.disabledStores.includes(store))
  const selectedTypes =
    filters.styles.length === 0
      ? styles
      : filters.styles.includes(STYLE_FILTER_NONE)
        ? []
        : filters.styles
  const bestUnderValue = activeBestUnderPrice(filters, primarySort)

  function updateFilters(patch: Partial<WineFilters>) {
    onFiltersChange({ ...filters, ...patch })
  }

  function applyBestUnder(price: number | null) {
    if (price === null) {
      updateFilters({ priceMax: '' })
      return
    }

    updateFilters({ priceMax: String(price) })
    onPrimarySortChange({ key: 'vivino_rating', dir: 'desc' })
    onSecondarySortChange({ key: 'none', dir: 'asc' })
  }

  function applyShopSelection(next: string[]) {
    if (next.length === stores.length) {
      updateFilters({ disabledStores: [] })
      return
    }
    updateFilters({
      disabledStores: stores.filter((store) => !next.includes(store)),
    })
  }

  function applyTypeSelection(next: string[]) {
    if (next.length === styles.length) {
      updateFilters({ styles: [] })
      return
    }
    if (next.length === 0) {
      updateFilters({ styles: [STYLE_FILTER_NONE] })
      return
    }
    updateFilters({ styles: next })
  }

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <UsageTipTarget tipId="sort-panel" className="flex items-center gap-1.5">
          <select
            aria-label="Sort by"
            style={filterSelectStyle(colors, true)}
            value={primarySort.key}
            onChange={(event) => {
              const key = event.target.value as SortFieldKey
              const match = QUICK_SORT_OPTIONS.find((o) => o.key === key)
              onPrimarySortChange({ key, dir: match?.dir ?? 'asc' })
              onSecondarySortChange({ key: 'none', dir: 'asc' })
            }}
          >
            {QUICK_SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                Sort by: {option.label}
              </option>
            ))}
          </select>
          <InstantTooltip label="Reverse sort direction">
            <button
              type="button"
              aria-label="Reverse sort direction"
              style={{
                ...chipStyle(colors, false),
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: CONTROL_HEIGHT,
                padding: 0,
              }}
              onClick={() => {
                const reversed = primarySort.dir === 'asc' ? 'desc' : 'asc'
                onPrimarySortChange({ ...primarySort, dir: reversed })
              }}
            >
              <ArrowUpDown size={11} strokeWidth={2} />
            </button>
          </InstantTooltip>
        </UsageTipTarget>

        <UsageTipTarget tipId="type-filter" className="flex-none">
          <PreviewFilterMultiSelect
            colors={colors}
            label="Type"
            emptyMessage="No wine types in list"
            options={styles}
            selected={selectedTypes}
            onChange={applyTypeSelection}
            selectAllLabel="All"
            allSelectedLabel="All colours"
          />
        </UsageTipTarget>

        <UsageTipTarget tipId="best-under-panel" className="flex-none">
          <select
            aria-label="Best bottles under"
            className="flex-none"
            style={filterSelectStyle(colors, !!bestUnderValue)}
            value={bestUnderValue}
            onChange={(event) => {
              const value = event.target.value
              applyBestUnder(value ? Number(value) : null)
            }}
          >
            <option value="">Best bottles under...</option>
            {BEST_UNDER_PRICE_PRESETS.map((price) => (
              <option key={price} value={String(price)}>
                Best bottles under {price.toLocaleString()} KSh
              </option>
            ))}
          </select>
        </UsageTipTarget>

        {stores.length > 0 ? (
          <UsageTipTarget tipId="shops-filter" className="flex-none">
            <PreviewFilterMultiSelect
              colors={colors}
              label="Show shops"
              emptyMessage="No shops in list"
              options={stores}
              selected={selectedShops}
              onChange={applyShopSelection}
              selectAllLabel="All"
            />
          </UsageTipTarget>
        ) : null}

        {isLoggedIn ? (
          <UsageTipTarget tipId="my-wines-filters" className="flex items-center gap-1.5">
            <InstantTooltip label={filters.includeBookmarked ? 'Hide bookmarked wines' : 'Show bookmarked wines'}>
              <button
                type="button"
                aria-label={filters.includeBookmarked ? 'Hide bookmarked wines' : 'Show bookmarked wines'}
                aria-pressed={filters.includeBookmarked}
                style={reviewFilterButtonStyle(colors, filters.includeBookmarked, 'wishlist', trial)}
                onClick={() => updateFilters({ includeBookmarked: !filters.includeBookmarked })}
              >
                <Bookmark
                  size={11}
                  strokeWidth={2}
                  fill={filters.includeBookmarked ? 'currentColor' : 'none'}
                  className={filters.includeBookmarked ? 'fill-current' : undefined}
                />
                {filters.includeBookmarked ? <ReviewFilterOnTick colors={colors} /> : null}
              </button>
            </InstantTooltip>
            <InstantTooltip label={filters.includeBuyAgain ? 'Hide buy again wines' : 'Show buy again wines'}>
              <button
                type="button"
                aria-label={filters.includeBuyAgain ? 'Hide buy again wines' : 'Show buy again wines'}
                aria-pressed={filters.includeBuyAgain}
                style={reviewFilterButtonStyle(colors, filters.includeBuyAgain, 'thumbsUp', trial)}
                onClick={() => updateFilters({ includeBuyAgain: !filters.includeBuyAgain })}
              >
                <ThumbsUp
                  size={11}
                  strokeWidth={2}
                  fill={trial && filters.includeBuyAgain ? 'currentColor' : 'none'}
                  className={trial && filters.includeBuyAgain ? 'fill-current' : undefined}
                />
                {filters.includeBuyAgain ? <ReviewFilterOnTick colors={colors} /> : null}
              </button>
            </InstantTooltip>
            <InstantTooltip label={filters.includeHidden ? 'Hide hidden wines' : 'Show hidden wines'}>
              <button
                type="button"
                aria-label={filters.includeHidden ? 'Hide hidden wines' : 'Show hidden wines'}
                aria-pressed={filters.includeHidden}
                style={reviewFilterButtonStyle(colors, filters.includeHidden, 'hide', trial)}
                onClick={() => updateFilters({ includeHidden: !filters.includeHidden })}
              >
                <EyeOff
                  size={11}
                  strokeWidth={2}
                  fill={trial && filters.includeHidden ? 'currentColor' : 'none'}
                  className={trial && filters.includeHidden ? 'fill-current' : undefined}
                />
                {filters.includeHidden ? <ReviewFilterOnTick colors={colors} /> : null}
              </button>
            </InstantTooltip>
          </UsageTipTarget>
        ) : null}
      </div>

      {showAdvanced ? (
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          <div style={titledSectionStyle(colors)}>
            <p style={sectionTitleStyle(colors)}>Advanced filters</p>
            <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            <UsageTipTarget tipId="highest-price-filter" className="flex-none">
              <select
                aria-label="Highest price"
                className="flex-none"
                style={filterSelectStyle(colors, !!filters.priceMax.trim())}
                value={filters.priceMax.trim() || ''}
                onChange={(event) => updateFilters({ priceMax: event.target.value })}
              >
                <option value="">Highest price: All</option>
                {buildPriceOptions(priceMaxBound).map((price) => (
                  <option key={price} value={String(price)}>
                    Max price: {price.toLocaleString()} KSh
                  </option>
                ))}
              </select>
            </UsageTipTarget>

            <UsageTipTarget tipId="lowest-rating-filter" className="flex-none">
              <select
                aria-label="Lowest rating"
                className="flex-none"
                style={filterSelectStyle(colors, !!filters.vivinoMin.trim())}
                value={filters.vivinoMin.trim() || ''}
                onChange={(event) => updateFilters({ vivinoMin: event.target.value })}
              >
                <option value="">Lowest rating: All</option>
                {buildRatingOptions().map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}★ and above
                  </option>
                ))}
              </select>
            </UsageTipTarget>

            <UsageTipTarget tipId="grapes-filter" className="flex-none">
              <PreviewFilterMultiSelect
                colors={colors}
                label="Grapes"
                emptyMessage="No grapes in list"
                options={grapes}
                selected={filters.grapes}
                onChange={(next) => updateFilters({ grapes: next })}
              />
            </UsageTipTarget>

            <UsageTipTarget tipId="countries-filter" className="flex-none">
              <PreviewFilterMultiSelect
                colors={colors}
                label="Countries"
                emptyMessage="No countries in list"
                options={countries}
                selected={selectedCountries}
                onChange={(next) => updateFilters({ regions: countryFiltersFromSelection(next) })}
              />
            </UsageTipTarget>

            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
