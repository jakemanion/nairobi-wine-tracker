'use client'

import { useState, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from 'react'
import {
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  EyeOff,
  HelpCircle,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import {
  BEST_UNDER_PRICE_PRESETS,
  countryFilterValue,
  countryFiltersFromSelection,
  selectedCountriesFromRegionFilters,
  type WineFilters,
} from '@/lib/wine-filters'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { PreviewFilterMultiSelect } from '@/components/preview/preview-filter-multi-select'
import { ReviewOnTick } from '@/components/preview/review-on-tick'
import { UsageTipTarget } from '@/components/preview/usage-tip-target'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
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
  styles: string[]
  countries: string[]
  priceBounds: PriceBounds | null
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
  isLoggedIn?: boolean
}

type FilterTabId = 'buy' | 'wine' | 'my-wines'

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
const GRAPE_FILTER_NONE = '__none__'
const COUNTRY_FILTER_NONE = '__none__'

const REVIEW_FILTER_COLORS = {
  wishlist: { bg: '#162010', border: '#2A5030', color: '#50A060' },
  shortlist: { bg: '#101830', border: '#2040A0', color: '#6090E0' },
  thumbsUp: { bg: '#3A2E08', border: '#8A7020', color: '#E0C040' },
  thumbsDown: { bg: '#2A1C1C', border: '#5A3030', color: '#F08080' },
  hide: { bg: '#2A1C1C', border: '#5A3030', color: '#C8AAAA' },
} as const

const TRIAL_REVIEW_FILTER_COLORS = {
  wishlist: { bg: '#99E2DA', border: '#029485', color: '#029485' },
  shortlist: { bg: '#F0F0F8', border: '#E4E4EE', color: '#7878A0' },
  thumbsUp: { bg: '#FFDD42', border: '#C89010', color: '#C89010' },
  thumbsDown: { bg: '#ffffff', border: '#E4E4EE', color: '#BCBCCE' },
  hide: { bg: '#ffffff', border: '#E4E4EE', color: '#C8AAAA' },
} as const

type ReviewFilterKind = 'wishlist' | 'shortlist' | 'thumbsUp' | 'thumbsDown' | 'hide' | 'unmarked'

function reviewFilterButtonStyle(
  colors: PreviewColors,
  active: boolean,
  kind: ReviewFilterKind,
  trial = false,
): CSSProperties {
  if (kind === 'unmarked') {
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
      background: active ? '#F0F0F8' : colors.buttonBg,
      border: `1px solid ${active ? '#E4E4EE' : colors.buttonBorder}`,
      color: active ? '#7878A0' : colors.buttonText,
      whiteSpace: 'nowrap' as const,
    }
  }
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

function filterSelectStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    display: 'block',
    alignSelf: 'center',
    height: CONTROL_HEIGHT,
    fontSize: CONTROL_FONT_SIZE,
    lineHeight: 1.2,
    padding: '0 22px 0 8px',
    margin: 0,
    borderRadius: colors.panelRadius,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? '#ffffff' : colors.buttonBg,
    border: `1px solid ${active ? colors.accent : colors.buttonBorder}`,
    color: active ? colors.summaryStrong : colors.buttonText,
    whiteSpace: 'nowrap' as const,
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  }
}

function FilterSelect({
  colors,
  active,
  children,
  className,
  ...props
}: {
  colors: PreviewColors
  active: boolean
  children: ReactNode
  className?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'style'>) {
  return (
    <div className={`relative flex-none self-center ${className ?? ''}`}>
      <select {...props} style={filterSelectStyle(colors, active)}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={12}
        strokeWidth={2}
        className="pointer-events-none absolute"
        style={{
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          color: active ? colors.summaryStrong : colors.buttonText,
          opacity: 0.75,
        }}
      />
    </div>
  )
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

function filterTabStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    height: CONTROL_HEIGHT,
    padding: '0 9px',
    fontSize: CONTROL_FONT_SIZE,
    lineHeight: 1.2,
    borderRadius: colors.panelRadius,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? '#ffffff' : 'transparent',
    border: `1px solid ${active ? colors.accent : 'transparent'}`,
    color: active ? colors.summaryStrong : colors.buttonText,
    whiteSpace: 'nowrap',
  }
}

function colourToggleStyle(
  colors: PreviewColors,
  {
    allMode,
    selected,
  }: {
    allMode: boolean
    selected: boolean
  },
): CSSProperties {
  const filled = allMode || selected
  return {
    height: CONTROL_HEIGHT,
    padding: '0 8px',
    fontSize: CONTROL_FONT_SIZE,
    lineHeight: 1.2,
    borderRadius: colors.panelRadius,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: filled ? '#ffffff' : colors.buttonBg,
    border: `1px solid ${filled ? colors.accent : colors.buttonBorder}`,
    color: filled ? colors.summaryStrong : colors.buttonText,
    opacity: allMode ? 0.42 : 1,
    whiteSpace: 'nowrap',
  }
}

function ColourStyleToggles({
  colors,
  styles,
  filters,
  onChange,
}: {
  colors: PreviewColors
  styles: string[]
  filters: WineFilters
  onChange: (styles: string[]) => void
}) {
  const allMode = filters.styles.length === 0
  const selectedSet = new Set(
    allMode || filters.styles.includes(STYLE_FILTER_NONE) ? [] : filters.styles,
  )

  function selectAll() {
    onChange([])
  }

  function toggleColour(style: string) {
    if (allMode) {
      onChange([style])
      return
    }

    const current = filters.styles.includes(STYLE_FILTER_NONE) ? [] : [...filters.styles]
    if (current.includes(style)) {
      const next = current.filter((item) => item !== style)
      onChange(next.length === 0 ? [STYLE_FILTER_NONE] : next)
      return
    }

    const next = [...current, style]
    onChange(next.length === styles.length ? [] : next)
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Wine colour">
      <button
        type="button"
        aria-pressed={allMode}
        style={chipStyle(colors, allMode)}
        onClick={selectAll}
      >
        All
      </button>
      {styles.map((style) => {
        const selected = selectedSet.has(style)
        return (
          <button
            key={style}
            type="button"
            aria-pressed={allMode || selected}
            style={colourToggleStyle(colors, { allMode, selected })}
            onClick={() => toggleColour(style)}
          >
            {style}
          </button>
        )
      })}
    </div>
  )
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
}: PreviewToolbarQuickFiltersProps) {
  const { visualStyle } = usePreviewTheme()
  const trial = visualStyle === 'trial'
  const priceMaxBound = priceBounds?.max ?? 10000
  const [activeTab, setActiveTab] = useState<FilterTabId>('buy')

  const selectedCountries = selectedCountriesFromRegionFilters(filters.regions)
  const allShopsEnabled = filters.disabledStores.length === 0
  const selectedShops = allShopsEnabled
    ? stores
    : stores.filter((store) => !filters.disabledStores.includes(store))
  const selectedGrapes =
    filters.grapes.length === 0
      ? grapes
      : filters.grapes.includes(GRAPE_FILTER_NONE)
        ? []
        : filters.grapes
  const selectedCountriesForUi = filters.regions.includes(countryFilterValue(COUNTRY_FILTER_NONE))
    ? []
    : filters.regions.length === 0
      ? countries
      : selectedCountries
  const bestUnderValue = activeBestUnderPrice(filters, primarySort)
  const visibleTab = !isLoggedIn && activeTab === 'my-wines' ? 'buy' : activeTab

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

  function applyGrapeSelection(next: string[]) {
    if (next.length === grapes.length) {
      updateFilters({ grapes: [] })
      return
    }
    if (next.length === 0) {
      updateFilters({ grapes: [GRAPE_FILTER_NONE] })
      return
    }
    updateFilters({ grapes: next })
  }

  function applyCountrySelection(next: string[]) {
    if (next.length === countries.length) {
      updateFilters({ regions: [] })
      return
    }
    if (next.length === 0) {
      updateFilters({ regions: [countryFilterValue(COUNTRY_FILTER_NONE)] })
      return
    }
    updateFilters({ regions: countryFiltersFromSelection(next) })
  }

  const tabs: Array<{ id: FilterTabId; label: string }> = [
    { id: 'buy', label: 'Buy' },
    { id: 'wine', label: 'Wine' },
    ...(isLoggedIn ? [{ id: 'my-wines' as const, label: 'My wines' }] : []),
  ]

  return (
    <div className="flex w-full flex-wrap items-stretch justify-between gap-x-4 gap-y-2 p-2">
      <div className="flex flex-col items-start gap-1.5">
        <UsageTipTarget tipId="type-filter" className="flex-none self-start">
          <ColourStyleToggles
            colors={colors}
            styles={styles}
            filters={filters}
            onChange={(next) => updateFilters({ styles: next })}
          />
        </UsageTipTarget>

        <UsageTipTarget tipId="sort-panel" className="flex items-center gap-1.5">
          <FilterSelect
            colors={colors}
            active
            aria-label="Sort by"
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
                Sort by {option.label}
              </option>
            ))}
          </FilterSelect>
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
      </div>

      <div
        aria-hidden
        className="hidden w-px self-stretch sm:block"
        style={{ background: colors.buttonBorder, minHeight: 44 }}
      />

      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1.5 sm:items-end">
        <div
          className="inline-flex items-center gap-0.5 self-start sm:self-end"
          role="tablist"
          aria-label="Filter groups"
          style={{
            padding: 2,
            borderRadius: colors.panelRadius,
            background: colors.buttonBg,
            border: `1px solid ${colors.buttonBorder}`,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={visibleTab === tab.id}
              style={filterTabStyle(colors, visibleTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 self-start sm:justify-end sm:self-end"
          role="tabpanel"
        >
          {visibleTab === 'buy' ? (
            <>
              <UsageTipTarget tipId="best-under-panel" className="flex-none self-center">
                <FilterSelect
                  colors={colors}
                  active={!!bestUnderValue}
                  aria-label="Best bottles under"
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
                </FilterSelect>
              </UsageTipTarget>

              {stores.length > 0 ? (
                <UsageTipTarget tipId="shops-filter" className="flex-none self-center">
                  <PreviewFilterMultiSelect
                    colors={colors}
                    label="Shop"
                    emptyMessage="No shops in list"
                    options={stores}
                    selected={selectedShops}
                    onChange={applyShopSelection}
                    selectAllLabel="All"
                  />
                </UsageTipTarget>
              ) : null}

              <UsageTipTarget tipId="highest-price-filter" className="flex-none self-center">
                <FilterSelect
                  colors={colors}
                  active={!!filters.priceMax.trim() && !bestUnderValue}
                  aria-label="Highest price"
                  value={bestUnderValue ? '' : filters.priceMax.trim() || ''}
                  onChange={(event) => updateFilters({ priceMax: event.target.value })}
                >
                  <option value="">All prices</option>
                  {buildPriceOptions(priceMaxBound).map((price) => (
                    <option key={price} value={String(price)}>
                      Highest price: {price.toLocaleString()} KSh
                    </option>
                  ))}
                </FilterSelect>
              </UsageTipTarget>
            </>
          ) : null}

          {visibleTab === 'wine' ? (
            <>
              <UsageTipTarget tipId="grapes-filter" className="flex-none self-center">
                <PreviewFilterMultiSelect
                  colors={colors}
                  label="Grape"
                  emptyMessage="No grapes in list"
                  options={grapes}
                  selected={selectedGrapes}
                  onChange={applyGrapeSelection}
                  selectAllLabel="All"
                />
              </UsageTipTarget>

              <UsageTipTarget tipId="countries-filter" className="flex-none self-center">
                <PreviewFilterMultiSelect
                  colors={colors}
                  label="Country"
                  emptyMessage="No countries in list"
                  options={countries}
                  selected={selectedCountriesForUi}
                  onChange={applyCountrySelection}
                  selectAllLabel="All"
                />
              </UsageTipTarget>
            </>
          ) : null}

          {visibleTab === 'my-wines' && isLoggedIn ? (
            <UsageTipTarget tipId="my-wines-filters" className="flex items-center gap-1.5 self-center">
              <InstantTooltip
                label={filters.includeUnmarked ? 'Hide unmarked wines' : 'Show unmarked wines'}
              >
                <button
                  type="button"
                  aria-label={
                    filters.includeUnmarked ? 'Hide unmarked wines' : 'Show unmarked wines'
                  }
                  aria-pressed={filters.includeUnmarked}
                  style={reviewFilterButtonStyle(colors, filters.includeUnmarked, 'unmarked', trial)}
                  onClick={() => updateFilters({ includeUnmarked: !filters.includeUnmarked })}
                >
                  <HelpCircle size={12} strokeWidth={2} />
                  {filters.includeUnmarked ? <ReviewOnTick colors={colors} /> : null}
                </button>
              </InstantTooltip>
              <InstantTooltip
                label={
                  filters.includeBookmarked ? 'Hide bookmarked wines' : 'Show bookmarked wines'
                }
              >
                <button
                  type="button"
                  aria-label={
                    filters.includeBookmarked ? 'Hide bookmarked wines' : 'Show bookmarked wines'
                  }
                  aria-pressed={filters.includeBookmarked}
                  style={reviewFilterButtonStyle(
                    colors,
                    filters.includeBookmarked,
                    'wishlist',
                    trial,
                  )}
                  onClick={() =>
                    updateFilters({ includeBookmarked: !filters.includeBookmarked })
                  }
                >
                  <Bookmark
                    size={11}
                    strokeWidth={2}
                    fill={filters.includeBookmarked ? 'currentColor' : 'none'}
                    className={filters.includeBookmarked ? 'fill-current' : undefined}
                  />
                  {filters.includeBookmarked ? <ReviewOnTick colors={colors} /> : null}
                </button>
              </InstantTooltip>
              <InstantTooltip
                label={filters.includeBuyAgain ? 'Hide buy again wines' : 'Show buy again wines'}
              >
                <button
                  type="button"
                  aria-label={
                    filters.includeBuyAgain ? 'Hide buy again wines' : 'Show buy again wines'
                  }
                  aria-pressed={filters.includeBuyAgain}
                  style={reviewFilterButtonStyle(
                    colors,
                    filters.includeBuyAgain,
                    'thumbsUp',
                    trial,
                  )}
                  onClick={() => updateFilters({ includeBuyAgain: !filters.includeBuyAgain })}
                >
                  <ThumbsUp
                    size={11}
                    strokeWidth={2}
                    fill={trial && filters.includeBuyAgain ? 'currentColor' : 'none'}
                    className={trial && filters.includeBuyAgain ? 'fill-current' : undefined}
                  />
                  {filters.includeBuyAgain ? <ReviewOnTick colors={colors} /> : null}
                </button>
              </InstantTooltip>
              <InstantTooltip
                label={
                  filters.includeDontBuyAgain
                    ? "Hide don't buy again wines"
                    : "Show don't buy again wines"
                }
              >
                <button
                  type="button"
                  aria-label={
                    filters.includeDontBuyAgain
                      ? "Hide don't buy again wines"
                      : "Show don't buy again wines"
                  }
                  aria-pressed={filters.includeDontBuyAgain}
                  style={reviewFilterButtonStyle(
                    colors,
                    filters.includeDontBuyAgain,
                    'thumbsDown',
                    trial,
                  )}
                  onClick={() =>
                    updateFilters({ includeDontBuyAgain: !filters.includeDontBuyAgain })
                  }
                >
                  <ThumbsDown
                    size={11}
                    strokeWidth={2}
                    fill={trial && filters.includeDontBuyAgain ? 'currentColor' : 'none'}
                    className={trial && filters.includeDontBuyAgain ? 'fill-current' : undefined}
                  />
                  {filters.includeDontBuyAgain ? <ReviewOnTick colors={colors} /> : null}
                </button>
              </InstantTooltip>
              <InstantTooltip
                label={filters.includeHidden ? 'Hide hidden wines' : 'Show hidden wines'}
              >
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
                  {filters.includeHidden ? <ReviewOnTick colors={colors} /> : null}
                </button>
              </InstantTooltip>
            </UsageTipTarget>
          ) : null}
        </div>
      </div>
    </div>
  )
}
