'use client'

import { useState, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from 'react'
import {
  ArrowUpDown,
  Banknote,
  Bookmark,
  ChevronDown,
  EyeOff,
  Grape,
  HelpCircle,
  Store,
  ThumbsDown,
  ThumbsUp,
  User,
  type LucideIcon,
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
import { BRAND_GREEN, REVIEW_PANEL_WIDTH, type PreviewColors } from '@/lib/preview/preview-colors'
import { styleRibbonStyle } from '@/lib/preview/wine-card-model'
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
  /** Mobile: whether the shops/price/wine tabs panel is open. Desktop always shows tabs. */
  tabsOpen?: boolean
  /** Mobile-only row rendered between quick chips and the tabs panel. */
  mobileSearchRow?: ReactNode
  /** Mobile: filter summary shown under the tab area when the panel is open. */
  filterSummary?: ReactNode
  filterSummaryTitle?: string
}

type FilterTabId = 'shops' | 'price' | 'wine' | 'my-wines'

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
  { key: 'vivino_rating', label: 'Quality', dir: 'desc' },
]

/** Sentinel so an empty Grape/Country selection can mean "match nothing" (unlike [] = all). */
const GRAPE_FILTER_NONE = '__none__'
const COUNTRY_FILTER_NONE = '__none__'

const STYLE_DISPLAY_ORDER = ['Red', 'White', 'Rosé', 'Sparkling', 'Sweet Red', 'Desert Wine'] as const

function sortStylesForDisplay(styles: string[]): string[] {
  const orderIndex = new Map(
    STYLE_DISPLAY_ORDER.map((style, index) => [style.toLowerCase(), index]),
  )
  return [...styles].sort((a, b) => {
    const aIndex = orderIndex.get(a.toLowerCase())
    const bIndex = orderIndex.get(b.toLowerCase())
    if (aIndex != null && bIndex != null) return aIndex - bIndex
    if (aIndex != null) return -1
    if (bIndex != null) return 1
    return a.localeCompare(b, undefined, { sensitivity: 'base' })
  })
}

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
  while (price <= 4000 && price <= maxBound) {
    options.push(price)
    price += 250
  }
  price = 5000
  while (price <= 10000 && price <= maxBound) {
    options.push(price)
    price += 1000
  }
  price = 20000
  while (price <= maxBound) {
    options.push(price)
    price += 10000
  }
  return options
}

function filterTabStyle(
  colors: PreviewColors,
  active: boolean,
  showDivider: boolean,
): CSSProperties {
  return {
    flex: '1 1 0',
    minWidth: 0,
    height: 26,
    padding: '0 6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    fontSize: CONTROL_FONT_SIZE,
    fontWeight: active ? 600 : 500,
    lineHeight: 1,
    borderRadius: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: active ? '#ffffff' : colors.buttonBg,
    color: active ? colors.summaryStrong : colors.buttonText,
    border: 'none',
    borderRight: showDivider ? `1px solid ${colors.buttonBorder}` : 'none',
    borderBottom: active ? `2px solid ${BRAND_GREEN}` : '2px solid transparent',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }
}

function colourToggleStyle(colors: PreviewColors, selected: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    height: CONTROL_HEIGHT,
    padding: '0 8px',
    fontSize: CONTROL_FONT_SIZE,
    lineHeight: 1.2,
    borderRadius: colors.panelRadius,
    cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans), sans-serif',
    background: selected ? '#ffffff' : colors.buttonBg,
    border: `1px solid ${selected ? colors.accent : colors.buttonBorder}`,
    color: selected ? colors.summaryStrong : colors.buttonText,
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
  const orderedStyles = sortStylesForDisplay(styles)
  const selectedSet = new Set(filters.styles)

  function toggleColour(style: string) {
    if (selectedSet.has(style)) {
      onChange(filters.styles.filter((item) => item !== style))
      return
    }

    const next = [...filters.styles, style]
    onChange(next.length === styles.length ? [] : next)
  }

  return (
    <div
      className="flex flex-nowrap items-center gap-1.5 sm:flex-wrap"
      role="group"
      aria-label="Wine type"
    >
      <span
        className="flex-none"
        style={{
          fontSize: CONTROL_FONT_SIZE,
          lineHeight: 1.2,
          color: colors.buttonText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontWeight: 600,
        }}
      >
        Type:
      </span>
      {orderedStyles.map((style) => {
        const selected = selectedSet.has(style)
        const ribbon = styleRibbonStyle(style)
        return (
          <button
            key={style}
            type="button"
            aria-pressed={selected}
            style={colourToggleStyle(colors, selected)}
            onClick={() => toggleColour(style)}
          >
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: ribbon?.background ?? '#8F1A2B',
                border: '1px solid rgba(0,0,0,0.12)',
                flexShrink: 0,
              }}
            />
            {style}
          </button>
        )
      })}
    </div>
  )
}

function ShopToggles({
  colors,
  stores,
  selected,
  onChange,
}: {
  colors: PreviewColors
  stores: string[]
  selected: string[]
  onChange: (stores: string[]) => void
}) {
  const selectedSet = new Set(selected)

  function toggleShop(store: string) {
    if (selectedSet.has(store)) {
      onChange(selected.filter((item) => item !== store))
      return
    }

    const next = [...selected, store]
    onChange(next.length === stores.length ? [] : next)
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Shops">
      {stores.map((store) => {
        const isSelected = selectedSet.has(store)
        return (
          <button
            key={store}
            type="button"
            aria-pressed={isSelected}
            style={colourToggleStyle(colors, isSelected)}
            onClick={() => toggleShop(store)}
          >
            {store}
          </button>
        )
      })}
    </div>
  )
}

function BestUnderToggles({
  colors,
  selectedPrice,
  onSelect,
}: {
  colors: PreviewColors
  selectedPrice: string
  onSelect: (price: number | null) => void
}) {
  return (
    <div
      className="flex flex-nowrap items-center gap-1.5 sm:flex-wrap"
      role="group"
      aria-label="Best bottles under"
    >
      <span
        className="flex-none"
        style={{
          fontSize: CONTROL_FONT_SIZE,
          lineHeight: 1.2,
          color: colors.buttonText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontWeight: 600,
        }}
      >
        Best bottles under...:
      </span>
      {BEST_UNDER_PRICE_PRESETS.map((price) => {
        const selected = selectedPrice === String(price)
        return (
          <button
            key={price}
            type="button"
            aria-pressed={selected}
            style={colourToggleStyle(colors, selected)}
            onClick={() => onSelect(selected ? null : price)}
          >
            {price.toLocaleString()} KSH
          </button>
        )
      })}
    </div>
  )
}

const TAB_ICONS: Record<FilterTabId, LucideIcon> = {
  shops: Store,
  price: Banknote,
  wine: Grape,
  'my-wines': User,
}

export const FILTER_CONTROL_HEIGHT = CONTROL_HEIGHT

type MyWinesFilterBarProps = {
  colors: PreviewColors
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  /** Mobile footer layout: caption above, labeled buttons with icons. */
  showLabels?: boolean
}

/** Review-status quick filters used in the My wines tab and mobile footer. */
export function MyWinesFilterBar({
  colors,
  filters,
  onFiltersChange,
  showLabels = false,
}: MyWinesFilterBarProps) {
  const { visualStyle } = usePreviewTheme()
  const trial = visualStyle === 'trial'

  function updateFilters(patch: Partial<WineFilters>) {
    onFiltersChange({ ...filters, ...patch })
  }

  const items = [
    {
      key: 'unmarked',
      label: 'Unmarked',
      active: filters.includeUnmarked,
      kind: 'unmarked' as const,
      tip: filters.includeUnmarked ? 'Hide unmarked wines' : 'Show unmarked wines',
      onClick: () => updateFilters({ includeUnmarked: !filters.includeUnmarked }),
      icon: showLabels ? null : <HelpCircle size={12} strokeWidth={2} />,
    },
    {
      key: 'bookmarked',
      label: 'Bookmarked',
      active: filters.includeBookmarked,
      kind: 'wishlist' as const,
      tip: filters.includeBookmarked ? 'Hide bookmarked wines' : 'Show bookmarked wines',
      onClick: () => updateFilters({ includeBookmarked: !filters.includeBookmarked }),
      icon: (
        <Bookmark
          size={11}
          strokeWidth={2}
          fill={filters.includeBookmarked ? 'currentColor' : 'none'}
          className={filters.includeBookmarked ? 'fill-current' : undefined}
        />
      ),
    },
    {
      key: 'buyAgain',
      label: 'Buy Again',
      active: filters.includeBuyAgain,
      kind: 'thumbsUp' as const,
      tip: filters.includeBuyAgain ? 'Hide buy again wines' : 'Show buy again wines',
      onClick: () => updateFilters({ includeBuyAgain: !filters.includeBuyAgain }),
      icon: (
        <ThumbsUp
          size={11}
          strokeWidth={2}
          fill={trial && filters.includeBuyAgain ? 'currentColor' : 'none'}
          className={trial && filters.includeBuyAgain ? 'fill-current' : undefined}
        />
      ),
    },
    {
      key: 'dontBuy',
      label: "Don't buy again",
      active: filters.includeDontBuyAgain,
      kind: 'thumbsDown' as const,
      tip: filters.includeDontBuyAgain
        ? "Hide don't buy again wines"
        : "Show don't buy again wines",
      onClick: () => updateFilters({ includeDontBuyAgain: !filters.includeDontBuyAgain }),
      icon: (
        <ThumbsDown
          size={11}
          strokeWidth={2}
          fill={trial && filters.includeDontBuyAgain ? 'currentColor' : 'none'}
          className={trial && filters.includeDontBuyAgain ? 'fill-current' : undefined}
        />
      ),
    },
    {
      key: 'ignored',
      label: 'Ignored',
      active: filters.includeHidden,
      kind: 'hide' as const,
      tip: filters.includeHidden ? 'Hide hidden wines' : 'Show hidden wines',
      onClick: () => updateFilters({ includeHidden: !filters.includeHidden }),
      icon: (
        <EyeOff
          size={11}
          strokeWidth={2}
          fill={trial && filters.includeHidden ? 'currentColor' : 'none'}
          className={trial && filters.includeHidden ? 'fill-current' : undefined}
        />
      ),
    },
  ]

  return (
    <UsageTipTarget
      tipId="my-wines-filters"
      className={
        showLabels
          ? 'flex w-full flex-col items-stretch gap-1'
          : 'flex items-center gap-1.5 self-center'
      }
    >
      {showLabels ? (
        <span
          className="px-2 text-center text-[8px] font-medium leading-tight"
          style={{
            color: colors.summaryText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Show or hide bottles based on your preferences
        </span>
      ) : null}
      <div
        className={
          showLabels
            ? 'flex w-full items-stretch'
            : 'flex items-center gap-1.5'
        }
      >
        {items.map((item) => {
          const button = (
            <button
              type="button"
              aria-label={item.tip}
              aria-pressed={item.active}
              style={{
                ...reviewFilterButtonStyle(colors, item.active, item.kind, trial),
                ...(showLabels
                  ? {
                      width: '100%',
                      height: 'auto',
                      minHeight: CONTROL_HEIGHT,
                      padding: '4px 4px',
                      gap: 3,
                      fontSize: 8,
                      fontWeight: 500,
                      borderRadius: 0,
                      opacity: item.active ? 1 : 0.5,
                    }
                  : {}),
              }}
              onClick={item.onClick}
            >
              {item.icon}
              {showLabels ? <span>{item.label}</span> : null}
              {item.active ? <ReviewOnTick colors={colors} /> : null}
            </button>
          )

          if (!showLabels) {
            return (
              <InstantTooltip key={item.key} label={item.tip}>
                {button}
              </InstantTooltip>
            )
          }

          return (
            <div key={item.key} className="min-w-0 flex-1">
              {button}
            </div>
          )
        })}
      </div>
    </UsageTipTarget>
  )
}

export function PreviewSortBar({
  colors,
  primarySort,
  onPrimarySortChange,
  onSecondarySortChange,
  compact = false,
}: {
  colors: PreviewColors
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
  /** Shorter labels for tight mobile toolbars. */
  compact?: boolean
}) {
  return (
    <UsageTipTarget tipId="sort-panel" className="flex items-center gap-1">
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
            {compact
              ? option.key === primarySort.key
                ? `Sorted by ${option.label}`
                : option.label
              : `Sort by ${option.label}`}
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
  tabsOpen = true,
  mobileSearchRow,
  filterSummary,
  filterSummaryTitle,
}: PreviewToolbarQuickFiltersProps) {
  const priceMaxBound = priceBounds?.max ?? 10000
  const [activeTab, setActiveTab] = useState<FilterTabId>('shops')

  const selectedCountries = selectedCountriesFromRegionFilters(filters.regions)
  const allShopsEnabled = filters.disabledStores.length === 0
  // Empty selection means "all shops" (same pattern as Type toggles).
  const selectedShops = allShopsEnabled
    ? []
    : stores.filter((store) => !filters.disabledStores.includes(store))
  const grapesAllSelected = filters.grapes.length === 0
  const selectedGrapes =
    grapesAllSelected || filters.grapes.includes(GRAPE_FILTER_NONE) ? [] : filters.grapes
  const countriesAllSelected = filters.regions.length === 0
  const selectedCountriesForUi =
    countriesAllSelected || filters.regions.includes(countryFilterValue(COUNTRY_FILTER_NONE))
      ? []
      : selectedCountries
  const bestUnderValue = activeBestUnderPrice(filters, primarySort)
  const visibleTab = !isLoggedIn && activeTab === 'my-wines' ? 'shops' : activeTab

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
    if (next.length === 0 || next.length === stores.length) {
      updateFilters({ disabledStores: [] })
      return
    }
    updateFilters({
      disabledStores: stores.filter((store) => !next.includes(store)),
    })
  }

  function applyGrapeSelection(next: string[]) {
    if (next.length === 0) {
      updateFilters({ grapes: [GRAPE_FILTER_NONE] })
      return
    }
    updateFilters({ grapes: next })
  }

  function selectAllGrapes() {
    updateFilters({ grapes: [] })
  }

  function applyCountrySelection(next: string[]) {
    if (next.length === 0) {
      updateFilters({ regions: [countryFilterValue(COUNTRY_FILTER_NONE)] })
      return
    }
    updateFilters({ regions: countryFiltersFromSelection(next) })
  }

  function selectAllCountries() {
    updateFilters({ regions: [] })
  }

  const tabs: Array<{ id: FilterTabId; label: string; desktopOnly?: boolean }> = [
    { id: 'shops', label: 'Shops' },
    { id: 'price', label: 'Price' },
    { id: 'wine', label: 'Wine' },
    // My wines lives in the mobile footer; keep the tab on desktop only.
    ...(isLoggedIn ? [{ id: 'my-wines' as const, label: 'My wines', desktopOnly: true }] : []),
  ]

  return (
    <div className="flex w-full flex-col items-stretch sm:flex-row sm:flex-wrap">
      <div className="min-w-0 flex-1 max-sm:overflow-x-auto max-sm:overscroll-x-contain sm:p-2">
        <div className="flex max-sm:w-max max-sm:flex-row max-sm:items-center max-sm:gap-3 sm:min-w-0 sm:w-full sm:flex-col sm:items-start sm:gap-1.5">
          <UsageTipTarget tipId="type-filter" className="flex-none">
            <ColourStyleToggles
              colors={colors}
              styles={styles}
              filters={filters}
              onChange={(next) => updateFilters({ styles: next })}
            />
          </UsageTipTarget>

          <UsageTipTarget tipId="best-under-panel" className="flex-none">
            <BestUnderToggles
              colors={colors}
              selectedPrice={bestUnderValue}
              onSelect={applyBestUnder}
            />
          </UsageTipTarget>
        </div>
      </div>

      {mobileSearchRow ? (
        <div className="flex w-full items-center gap-2 px-2 py-[3px] sm:hidden">
          {mobileSearchRow}
        </div>
      ) : null}

      <div
        id="preview-filter-tabs"
        className={`filter-panel-aside max-w-full flex-col items-stretch px-0 py-1 sm:flex sm:flex-none sm:border-l sm:p-2 ${
          tabsOpen ? 'flex' : 'hidden'
        }`}
        style={{
          width: REVIEW_PANEL_WIDTH,
          flexBasis: REVIEW_PANEL_WIDTH,
          borderLeftColor: colors.buttonBorder,
        }}
      >
        <div
          className="flex w-full flex-col overflow-hidden"
          style={{
            border: `1px solid ${BRAND_GREEN}`,
            borderRadius: 4,
          }}
        >
          <div
            className="flex w-full items-stretch"
            role="tablist"
            aria-label="Filter groups"
            style={{
              background: colors.buttonBg,
            }}
          >
            {tabs.map((tab, index) => {
              const Icon = TAB_ICONS[tab.id]
              const tabStyle = filterTabStyle(
                colors,
                visibleTab === tab.id,
                index < tabs.length - 1,
              )
              // Drop inline display so Tailwind can hide desktop-only tabs on mobile.
              const { display: _display, ...desktopOnlyStyle } = tabStyle
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={visibleTab === tab.id}
                  className={tab.desktopOnly ? 'hidden sm:inline-flex' : undefined}
                  style={tab.desktopOnly ? desktopOnlyStyle : tabStyle}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon
                    aria-hidden
                    size={11}
                    strokeWidth={2}
                    style={{ color: colors.buttonText, flexShrink: 0 }}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div
            className="flex flex-wrap items-center justify-center gap-1.5"
            role="tabpanel"
            style={{
              padding: '6px 8px',
              minHeight: CONTROL_HEIGHT + 14,
              boxSizing: 'border-box',
              background: '#ffffff',
            }}
          >
          {visibleTab === 'shops' ? (
            stores.length > 0 ? (
              <UsageTipTarget tipId="shops-filter" className="w-full self-center">
                <ShopToggles
                  colors={colors}
                  stores={stores}
                  selected={selectedShops}
                  onChange={applyShopSelection}
                />
              </UsageTipTarget>
            ) : null
          ) : null}

          {visibleTab === 'price' ? (
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
                  selectAllActive={grapesAllSelected}
                  onChange={applyGrapeSelection}
                  onSelectAll={selectAllGrapes}
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
                  selectAllActive={countriesAllSelected}
                  onChange={applyCountrySelection}
                  onSelectAll={selectAllCountries}
                  selectAllLabel="All"
                />
              </UsageTipTarget>
            </>
          ) : null}

          {visibleTab === 'my-wines' && isLoggedIn ? (
            <div className="hidden sm:block">
              <MyWinesFilterBar
                colors={colors}
                filters={filters}
                onFiltersChange={onFiltersChange}
              />
            </div>
          ) : null}
        </div>
        </div>

        {filterSummary ? (
          <p
            className="m-0 w-full min-w-0 px-2 pt-1.5 text-center sm:hidden"
            title={filterSummaryTitle}
            style={{
              color: colors.summaryText,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 8,
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
            }}
          >
            {filterSummary}
          </p>
        ) : null}
      </div>
    </div>
  )
}
