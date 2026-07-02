'use client'

import { useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { ClearShortlistButton } from '@/components/clear-shortlist-button'
import { PreviewToolbarQuickFilters } from '@/components/preview/preview-toolbar-quick-filters'
import { WineFilterPanel, type SortCriterion } from '@/components/wine-filter-panel'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { buildListStateSummary } from '@/lib/preview/list-state-summary'
import type { WineFilters } from '@/lib/wine-filters'

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
  userId: string
  onShortlistCleared: () => void
  resultCount: number
  totalCount: number
  priceBounds: { min: number; max: number } | null
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
  userId,
  onShortlistCleared,
  resultCount,
  totalCount,
  priceBounds,
}: PreviewToolbarProps) {
  const { colors, mode } = usePreviewTheme()
  const searchActive = searchQuery.trim().length > 0
  const toolsActive = toolsExpanded || activeFilterCount > 0 || searchActive

  const summaryText = useMemo(
    () =>
      buildListStateSummary({
        filters,
        searchQuery,
        primarySort,
        secondarySort,
        resultCount,
        totalCount,
      }),
    [filters, searchQuery, primarySort, secondarySort, resultCount, totalCount],
  )

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${toolsActive ? colors.toolbarBorderActive : colors.toolbarBorder}`,
        background: colors.toolbarBg,
        boxShadow: toolsExpanded ? '0 4px 20px rgba(0,0,0,0.12)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 p-3 flex-wrap">
        <div className="relative w-[8.5rem] flex-shrink-0">
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
          Filter &amp; sort
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
        <ClearShortlistButton
          userId={userId}
          theme={mode}
          onCleared={onShortlistCleared}
        />
      </div>

      <div className="px-3 pb-2.5 flex justify-center min-w-0">
        <p
          className="m-0 w-full text-center truncate"
          title={summaryText}
          style={{
            color: colors.summaryText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 11,
            lineHeight: 1.3,
          }}
        >
          {summaryText}
        </p>
      </div>

      {!toolsExpanded ? (
        <div style={{ borderTop: `1px solid ${colors.toolbarBorder}` }}>
          <PreviewToolbarQuickFilters
            colors={colors}
            filters={filters}
            onFiltersChange={onFiltersChange}
            stores={filterOptions.stores}
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
            userId={userId}
            onShortlistCleared={onShortlistCleared}
          />
        </div>
      ) : null}
    </div>
  )
}
