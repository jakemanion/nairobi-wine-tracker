'use client'

import { Search } from 'lucide-react'
import { PreviewToolbarQuickFilters } from '@/components/preview/preview-toolbar-quick-filters'
import type { SortCriterion } from '@/components/wine-filter-panel'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  applyHideUnwantedToggle,
  isHideUnwantedPreset,
  type RegionFilterGroup,
  type WineFilters,
} from '@/lib/wine-filters'

function buildResultCountText(resultCount: number, totalCount: number): string {
  return resultCount === totalCount
    ? `Showing all ${resultCount} wines`
    : `Showing ${resultCount} of ${totalCount} wines`
}

type PreviewToolbarProps = {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  activeFilterCount: number
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  filterOptions: {
    stores: string[]
    grapes: string[]
    producers: string[]
    countries: string[]
    regions: string[]
    regionGroups: RegionFilterGroup[]
  }
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
  resultCount: number
  totalCount: number
  priceBounds: { min: number; max: number; median: number } | null
}

export function PreviewToolbar({
  searchQuery,
  onSearchQueryChange,
  activeFilterCount,
  filters,
  onFiltersChange,
  filterOptions,
  primarySort,
  onPrimarySortChange,
  onSecondarySortChange,
  resultCount,
  totalCount,
  priceBounds,
}: PreviewToolbarProps) {
  const { colors } = usePreviewTheme()
  const searchActive = searchQuery.trim().length > 0
  const toolsActive = activeFilterCount > 0 || searchActive
  const resultCountText = buildResultCountText(resultCount, totalCount)
  const hideUnwantedActive =
    isHideUnwantedPreset(filters) ||
    (filters.hideUnwanted &&
      filters.wishlist.length === 0 &&
      filters.triedStatus.length === 0)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${toolsActive ? colors.toolbarBorderActive : colors.toolbarBorder}`,
        background: colors.toolbarBg,
      }}
    >
      <div className="flex items-center gap-2 p-3 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="relative w-[17rem] flex-shrink-0">
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: colors.muted }}
            />
            <input
              type="search"
              value={searchQuery}
              placeholder="Search…"
              aria-label="Search producer or wine name"
              className="w-full text-sm rounded-md pl-7 pr-2 py-1 focus:outline-none"
              style={{
                background: colors.searchBg,
                border: `1px solid ${colors.searchBorder}`,
                color: colors.searchText,
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </div>
          {searchActive ? (
            <button
              type="button"
              className="text-xs px-3 py-2 rounded-lg flex-shrink-0"
              style={{
                background: colors.buttonBg,
                border: `1px solid ${colors.buttonBorder}`,
                color: colors.buttonText,
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
              onClick={() => onSearchQueryChange('')}
            >
              Clear search
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <p
            className="m-0 truncate"
            title={resultCountText}
            style={{
              color: colors.summaryText,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 11,
              lineHeight: 1.3,
            }}
          >
            {resultCountText}
          </p>
          <button
            type="button"
            aria-pressed={hideUnwantedActive}
            className="flex items-center text-xs px-3 py-2 rounded-lg flex-shrink-0"
            style={{
              background: hideUnwantedActive ? colors.searchBg : colors.buttonBg,
              border: `1px solid ${hideUnwantedActive ? '#C93048' : colors.buttonBorder}`,
              color: hideUnwantedActive ? colors.searchText : colors.buttonText,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() =>
              onFiltersChange(applyHideUnwantedToggle(filters, !hideUnwantedActive))
            }
          >
            {hideUnwantedActive ? 'Show unwanted' : 'Hide unwanted'}
          </button>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.toolbarBorder}` }}>
        <PreviewToolbarQuickFilters
          colors={colors}
          filters={filters}
          onFiltersChange={onFiltersChange}
          stores={filterOptions.stores}
          grapes={filterOptions.grapes}
          countries={filterOptions.countries}
          priceBounds={priceBounds}
          primarySort={primarySort}
          onPrimarySortChange={onPrimarySortChange}
          onSecondarySortChange={onSecondarySortChange}
        />
      </div>
    </div>
  )
}
