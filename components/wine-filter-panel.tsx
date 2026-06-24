'use client'

import type { CSSProperties } from 'react'
import {
  EMPTY_WINE_FILTERS,
  type TriedStatusFilterValue,
  type WineFilters,
  type WishlistFilterValue,
} from '@/lib/wine-filters'

export type SortFieldKey =
  | 'winery'
  | 'wine_name'
  | 'vintage'
  | 'country'
  | 'region'
  | 'grapes'
  | 'style'
  | 'vivino_rating'
  | 'value_score'
  | 'store_prices'
  | 'my_rating'
  | 'wishlist'
  | 'tried_status'
  | 'notes'

export type SortFieldOption = SortFieldKey | 'none'
export type SortDir = 'asc' | 'desc'

export type SortCriterion = {
  key: SortFieldOption
  dir: SortDir
}

const SORT_FIELD_OPTIONS: Array<{ value: SortFieldKey; label: string }> = [
  { value: 'winery', label: 'Producer' },
  { value: 'wine_name', label: 'Wine name' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'grapes', label: 'Grapes' },
  { value: 'style', label: 'Style' },
  { value: 'vivino_rating', label: 'Vivino rating' },
  { value: 'value_score', label: 'Value score' },
  { value: 'store_prices', label: 'Store price' },
  { value: 'my_rating', label: 'My rating' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'tried_status', label: 'Tried' },
  { value: 'notes', label: 'Notes' },
]

const SORT_DIR_OPTIONS: Array<{ value: SortDir; label: string }> = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
]

const WISHLIST_FILTER_OPTIONS: Array<{ value: WishlistFilterValue; label: string }> = [
  { value: 'unset', label: 'Not set' },
  { value: 0, label: "Don't want" },
  { value: 1, label: 'Want' },
  { value: 2, label: 'Expensive treat' },
  { value: 3, label: 'Very expensive treat' },
]

const TRIED_STATUS_FILTER_OPTIONS: Array<{ value: TriedStatusFilterValue; label: string }> = [
  { value: 'unset', label: 'Not set' },
  { value: 0, label: 'Tried' },
  { value: 1, label: 'Buy again' },
  { value: 2, label: "Don't buy again" },
]

const controlStyle: CSSProperties = {
  fontSize: 14,
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #ccc',
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
}

const panelStyle: CSSProperties = {
  border: '1px solid #ccc',
  borderRadius: 6,
  marginTop: 12,
  background: '#fafafa',
}

const toggleButtonStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 12px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  textAlign: 'left',
}

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 13,
  fontWeight: 600,
  color: '#333',
}

const fieldLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  color: '#444',
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 12,
}

const checkboxGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
}

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

function defaultSortDir(key: SortFieldKey): SortDir {
  switch (key) {
    case 'value_score':
    case 'vivino_rating':
    case 'my_rating':
    case 'wishlist':
    case 'tried_status':
      return 'desc'
    default:
      return 'asc'
  }
}

function toggleArrayValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

type WineFilterPanelProps = {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  filterOptions: {
    stores: string[]
    producers: string[]
    countries: string[]
    regions: string[]
  }
  activeFilterCount: number
  primarySort: SortCriterion
  secondarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
  ratingThenPriceActive: boolean
  onApplyRatingThenPrice: () => void
}

export function WineFilterPanel({
  expanded,
  onExpandedChange,
  filters,
  onFiltersChange,
  filterOptions,
  activeFilterCount,
  primarySort,
  secondarySort,
  onPrimarySortChange,
  onSecondarySortChange,
  ratingThenPriceActive,
  onApplyRatingThenPrice,
}: WineFilterPanelProps) {
  function updateFilters(patch: Partial<WineFilters>) {
    onFiltersChange({ ...filters, ...patch })
  }

  return (
    <div style={panelStyle}>
      <button
        type="button"
        style={toggleButtonStyle}
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
      >
        <span>
          Filters &amp; sort
          {activeFilterCount > 0 ? (
            <span style={{ marginLeft: 8, fontWeight: 500, color: '#0a7' }}>
              ({activeFilterCount} active)
            </span>
          ) : null}
        </span>
        <span aria-hidden style={{ color: '#666' }}>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <h3 style={sectionTitleStyle}>Filters</h3>
            <div style={gridStyle}>
              <label style={fieldLabelStyle}>
                <span>Price min</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Any"
                  value={filters.priceMin}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ priceMin: event.target.value })}
                />
              </label>
              <label style={fieldLabelStyle}>
                <span>Price max</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Any"
                  value={filters.priceMax}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ priceMax: event.target.value })}
                />
              </label>
              <label style={fieldLabelStyle}>
                <span>Vivino score min</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={5}
                  step={0.1}
                  placeholder="Any"
                  value={filters.vivinoMin}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ vivinoMin: event.target.value })}
                />
              </label>
              <label style={fieldLabelStyle}>
                <span>Vivino score max</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={5}
                  step={0.1}
                  placeholder="Any"
                  value={filters.vivinoMax}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ vivinoMax: event.target.value })}
                />
              </label>
              <label style={fieldLabelStyle}>
                <span>Producer</span>
                <select
                  value={filters.producer}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ producer: event.target.value })}
                >
                  <option value="">All</option>
                  {filterOptions.producers.map((producer) => (
                    <option key={producer} value={producer}>
                      {producer}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldLabelStyle}>
                <span>Country</span>
                <select
                  value={filters.country}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ country: event.target.value })}
                >
                  <option value="">All</option>
                  {filterOptions.countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldLabelStyle}>
                <span>Region</span>
                <select
                  value={filters.region}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ region: event.target.value })}
                >
                  <option value="">All</option>
                  {filterOptions.regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label style={fieldLabelStyle}>
                <span>Grapes</span>
                <input
                  type="text"
                  placeholder="Contains…"
                  value={filters.grapes}
                  style={controlStyle}
                  onChange={(event) => updateFilters({ grapes: event.target.value })}
                />
              </label>
              <div style={{ ...fieldLabelStyle, gridColumn: '1 / -1' }}>
                <span>Store</span>
                <div style={checkboxGroupStyle}>
                  {filterOptions.stores.length === 0 ? (
                    <span style={{ color: '#888' }}>No stores in list</span>
                  ) : (
                    filterOptions.stores.map((store) => (
                      <label key={store} style={checkboxRowStyle}>
                        <input
                          type="checkbox"
                          checked={filters.stores.includes(store)}
                          onChange={() =>
                            updateFilters({
                              stores: toggleArrayValue(filters.stores, store),
                            })
                          }
                        />
                        <span>{store}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div style={fieldLabelStyle}>
                <span>Wishlist status</span>
                <div style={checkboxGroupStyle}>
                  {WISHLIST_FILTER_OPTIONS.map((option) => (
                    <label key={String(option.value)} style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={filters.wishlist.includes(option.value)}
                        onChange={() =>
                          updateFilters({
                            wishlist: toggleArrayValue(filters.wishlist, option.value),
                          })
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={fieldLabelStyle}>
                <span>Tried status</span>
                <div style={checkboxGroupStyle}>
                  {TRIED_STATUS_FILTER_OPTIONS.map((option) => (
                    <label key={String(option.value)} style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={filters.triedStatus.includes(option.value)}
                        onChange={() =>
                          updateFilters({
                            triedStatus: toggleArrayValue(filters.triedStatus, option.value),
                          })
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 style={sectionTitleStyle}>Sorting</h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: 14,
              }}
            >
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>Sort by</span>
                <select
                  aria-label="Primary sort field"
                  value={primarySort.key}
                  style={{ ...controlStyle, width: 'auto' }}
                  onChange={(event) => {
                    const key = event.target.value as SortFieldKey
                    onPrimarySortChange({ key, dir: defaultSortDir(key) })
                  }}
                >
                  {SORT_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Primary sort direction"
                  value={primarySort.dir}
                  style={{ ...controlStyle, width: 'auto' }}
                  disabled={primarySort.key === 'none'}
                  onChange={(event) =>
                    onPrimarySortChange({ ...primarySort, dir: event.target.value as SortDir })
                  }
                >
                  {SORT_DIR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>then by</span>
                <select
                  aria-label="Secondary sort field"
                  value={secondarySort.key}
                  style={{ ...controlStyle, width: 'auto' }}
                  onChange={(event) => {
                    const key = event.target.value as SortFieldOption
                    if (key === 'none') {
                      onSecondarySortChange({ key: 'none', dir: 'asc' })
                      return
                    }
                    onSecondarySortChange({ key, dir: defaultSortDir(key) })
                  }}
                >
                  <option value="none">None</option>
                  {SORT_FIELD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Secondary sort direction"
                  value={secondarySort.dir}
                  style={{ ...controlStyle, width: 'auto' }}
                  disabled={secondarySort.key === 'none'}
                  onChange={(event) =>
                    onSecondarySortChange({ ...secondarySort, dir: event.target.value as SortDir })
                  }
                >
                  {SORT_DIR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={onApplyRatingThenPrice}
                aria-pressed={ratingThenPriceActive}
                style={{
                  padding: '6px 12px',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontWeight: ratingThenPriceActive ? 600 : 400,
                }}
              >
                Sort: rating → price
              </button>
            </div>
          </section>

          <div>
            <button
              type="button"
              disabled={activeFilterCount === 0}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                cursor: activeFilterCount === 0 ? 'default' : 'pointer',
                opacity: activeFilterCount === 0 ? 0.5 : 1,
              }}
              onClick={() => onFiltersChange(EMPTY_WINE_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
