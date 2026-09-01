'use client'

import type { CSSProperties } from 'react'
import { ArrowUpDown, EyeOff, Heart, ListChecks, ThumbsUp } from 'lucide-react'
import {
  applyHideUnwantedToggle,
  BEST_UNDER_PRICE_PRESETS,
  countryFiltersFromSelection,
  isHideUnwantedPreset,
  selectedCountriesFromRegionFilters,
  type WineFilters,
} from '@/lib/wine-filters'
import { PreviewFilterMultiSelect } from '@/components/preview/preview-filter-multi-select'
import { UsageTipTarget } from '@/components/preview/usage-tip-target'
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
}

const CONTROL_HEIGHT = 32

function chipStyle(colors: PreviewColors, active: boolean): CSSProperties {
  return {
    height: CONTROL_HEIGHT,
    padding: '0 10px',
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
    padding: 8,
    borderRadius: 8,
    background: colors.searchBg,
    border: `1px solid ${colors.searchBorder}`,
    fontFamily: 'var(--font-dm-sans), sans-serif',
  }
}

function titledSectionStyle(colors: PreviewColors): CSSProperties {
  return {
    ...sliderGroupStyle(colors),
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  }
}

function sectionTitleStyle(colors: PreviewColors, bold = false): CSSProperties {
  return {
    margin: 0,
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: bold ? 600 : 500,
    color: colors.muted,
    fontFamily: 'var(--font-dm-sans), sans-serif',
    lineHeight: 1.2,
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

const QUICK_SORT_OPTIONS: Array<{ key: SortFieldKey; label: string; dir: 'asc' | 'desc' }> = [
  { key: 'value_score', label: 'Value', dir: 'desc' },
  { key: 'winery', label: 'Producer', dir: 'asc' },
  { key: 'wine_name', label: 'Name', dir: 'asc' },
  { key: 'store_prices', label: 'Price', dir: 'asc' },
  { key: 'vivino_rating', label: 'Rating', dir: 'desc' },
]


const REVIEW_FILTER_COLORS = {
  wishlist: { bg: '#162010', border: '#2A5030', color: '#50A060' },
  shortlist: { bg: '#101830', border: '#2040A0', color: '#6090E0' },
  thumbsUp: { bg: '#3A2E08', border: '#8A7020', color: '#E0C040' },
  hide: { bg: '#2A1C1C', border: '#5A3030', color: '#F08080' },
} as const

function reviewFilterButtonStyle(
  colors: PreviewColors,
  active: boolean,
  kind: 'wishlist' | 'shortlist' | 'thumbsUp' | 'hide',
): CSSProperties {
  const accent = REVIEW_FILTER_COLORS[kind]
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    padding: 0,
    fontSize: 12,
    lineHeight: 1.2,
    borderRadius: 8,
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
    height: CONTROL_HEIGHT,
    fontSize: 12,
    lineHeight: 1.2,
    padding: '0 12px',
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
}: PreviewToolbarQuickFiltersProps) {
  const priceMaxBound = priceBounds?.max ?? 10000
  const hideUnwantedActive =
    isHideUnwantedPreset(filters) ||
    (filters.hideUnwanted &&
      filters.wishlist.length === 0 &&
      filters.triedStatus.length === 0)

  const selectedCountries = selectedCountriesFromRegionFilters(filters.regions)

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
    <div className="flex flex-col gap-2.5 p-3 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <div style={titledSectionStyle(colors)}>
          <p style={sectionTitleStyle(colors)}>Filters</p>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
          <UsageTipTarget tipId="highest-price-filter" className="flex-none">
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
          </UsageTipTarget>

          <UsageTipTarget tipId="lowest-rating-filter" className="flex-none">
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
                  {rating}★ and above
                </option>
              ))}
            </select>
          </UsageTipTarget>

          <UsageTipTarget tipId="type-filter" className="flex-none">
            <PreviewFilterMultiSelect
              colors={colors}
              label="Type"
              emptyMessage="No wine types in list"
              options={styles}
              selected={filters.styles}
              onChange={(next) => updateFilters({ styles: next })}
            />
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

          {isLoggedIn ? (
            <UsageTipTarget tipId="my-wines-filters" className="ml-auto flex flex-col gap-1.5 pl-2">
              <span style={sliderLabelStyle(colors)}>My Wines</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Show wishlisted only"
                  aria-label="Show wishlisted only"
                  aria-pressed={filters.showWishlistOnly}
                  style={reviewFilterButtonStyle(colors, filters.showWishlistOnly, 'wishlist')}
                  onClick={() => updateFilters({ showWishlistOnly: !filters.showWishlistOnly })}
                >
                  <Heart size={14} strokeWidth={2} className={filters.showWishlistOnly ? 'fill-current' : undefined} />
                </button>
                <button
                  type="button"
                  title="Show shortlisted only"
                  aria-label="Show shortlisted only"
                  aria-pressed={filters.showShortlistOnly}
                  style={reviewFilterButtonStyle(colors, filters.showShortlistOnly, 'shortlist')}
                  onClick={() => updateFilters({ showShortlistOnly: !filters.showShortlistOnly })}
                >
                  <ListChecks size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  title="Show buy-again only"
                  aria-label="Show buy-again only"
                  aria-pressed={filters.showThumbsUpOnly}
                  style={reviewFilterButtonStyle(colors, filters.showThumbsUpOnly, 'thumbsUp')}
                  onClick={() => updateFilters({ showThumbsUpOnly: !filters.showThumbsUpOnly })}
                >
                  <ThumbsUp size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  title={hideUnwantedActive ? 'Show unwanted wines' : 'Hide unwanted wines'}
                  aria-label={hideUnwantedActive ? 'Show unwanted wines' : 'Hide unwanted wines'}
                  aria-pressed={hideUnwantedActive}
                  style={reviewFilterButtonStyle(colors, hideUnwantedActive, 'hide')}
                  onClick={() => onFiltersChange(applyHideUnwantedToggle(filters, !hideUnwantedActive))}
                >
                  <EyeOff size={14} strokeWidth={2} />
                </button>
              </div>
            </UsageTipTarget>
          ) : null}
          </div>
        </div>
      </div>

      {stores.length > 0 ? (
        <UsageTipTarget tipId="shops-filter" style={titledSectionStyle(colors)}>
          <p style={sectionTitleStyle(colors, true)}>Shops</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
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
        </UsageTipTarget>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <UsageTipTarget
          tipId="sort-panel"
          className="flex items-center gap-1.5"
          style={sliderGroupStyle(colors)}
        >
          <select
            aria-label="Sort by"
            style={filterSelectStyle(colors, primarySort.key !== 'value_score')}
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
          <button
            type="button"
            title="Reverse sort direction"
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
    </div>
  )
}
