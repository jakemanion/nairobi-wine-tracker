'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import { PreviewToolbarQuickFilters } from '@/components/preview/preview-toolbar-quick-filters'
import { WineFilterPanel, type SortCriterion } from '@/components/wine-filter-panel'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import type { WineFilters } from '@/lib/wine-filters'

function buildResultCountText(resultCount: number, totalCount: number): string {
  return resultCount === totalCount
    ? `Showing all ${resultCount} wines`
    : `Showing ${resultCount} of ${totalCount} wines`
}

type PreviewToolbarProps = {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  toolsExpanded: boolean
  onToolsExpandedChange: (expanded: boolean) => void
  activeFilterCount: number
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  filterOptions: {
    stores: string[]
    grapes: string[]
    producers: string[]
    countries: string[]
    regions: string[]
  }
  primarySort: SortCriterion
  secondarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
  ratingThenPriceActive: boolean
  onApplyRatingThenPrice: () => void
  resultCount: number
  totalCount: number
  priceBounds: { min: number; max: number; median: number } | null
}

export function PreviewToolbar({
  searchQuery,
  onSearchQueryChange,
  toolsExpanded,
  onToolsExpandedChange,
  activeFilterCount,
  filters,
  onFiltersChange,
  filterOptions,
  primarySort,
  secondarySort,
  onPrimarySortChange,
  onSecondarySortChange,
  ratingThenPriceActive,
  onApplyRatingThenPrice,
  resultCount,
  totalCount,
  priceBounds,
}: PreviewToolbarProps) {
  const { colors, mode } = usePreviewTheme()
  const searchActive = searchQuery.trim().length > 0
  const toolsActive = toolsExpanded || activeFilterCount > 0 || searchActive
  const resultCountText = buildResultCountText(resultCount, totalCount)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${toolsActive ? colors.toolbarBorderActive : colors.toolbarBorder}`,
        background: colors.toolbarBg,
        boxShadow: toolsExpanded ? '0 4px 20px rgba(0,0,0,0.12)' : 'none',
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
              maxLength={8}
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
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all flex-shrink-0"
            style={{
              background: toolsExpanded ? colors.searchBg : colors.buttonBg,
              border: `1px solid ${activeFilterCount > 0 ? '#C93048' : colors.buttonBorder}`,
              color: toolsExpanded || activeFilterCount > 0 ? colors.searchText : colors.buttonText,
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
            aria-expanded={toolsExpanded}
            onClick={() => onToolsExpandedChange(!toolsExpanded)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            More filters
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
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
            aria-pressed={filters.hideUnwanted}
            className="flex items-center text-xs px-3 py-2 rounded-lg flex-shrink-0"
            style={{
              background: filters.hideUnwanted ? colors.searchBg : colors.buttonBg,
              border: `1px solid ${filters.hideUnwanted ? '#C93048' : colors.buttonBorder}`,
              color: filters.hideUnwanted ? colors.searchText : colors.buttonText,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => onFiltersChange({ ...filters, hideUnwanted: !filters.hideUnwanted })}
          >
            {filters.hideUnwanted ? 'Show unwanted' : 'Hide unwanted'}
          </button>
        </div>
      </div>

      {!toolsExpanded ? (
        <div style={{ borderTop: `1px solid ${colors.toolbarBorder}` }}>
          <PreviewToolbarQuickFilters
            colors={colors}
            filters={filters}
            onFiltersChange={onFiltersChange}
            stores={filterOptions.stores}
            grapes={filterOptions.grapes}
            regions={filterOptions.regions}
            priceBounds={priceBounds}
            primarySort={primarySort}
            onPrimarySortChange={onPrimarySortChange}
            onSecondarySortChange={onSecondarySortChange}
          />
        </div>
      ) : null}

      {toolsExpanded ? (
        <div style={{ borderTop: `1px solid ${colors.toolbarBorder}` }}>
          <WineFilterPanel
            embedded
            theme={mode}
            expanded
            onExpandedChange={onToolsExpandedChange}
            filters={filters}
            onFiltersChange={onFiltersChange}
            filterOptions={filterOptions}
            activeFilterCount={activeFilterCount}
            primarySort={primarySort}
            secondarySort={secondarySort}
            onPrimarySortChange={onPrimarySortChange}
            onSecondarySortChange={onSecondarySortChange}
            ratingThenPriceActive={ratingThenPriceActive}
            onApplyRatingThenPrice={onApplyRatingThenPrice}
          />
        </div>
      ) : null}
    </div>
  )
}
