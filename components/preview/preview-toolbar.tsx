'use client'

import { useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
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
  resultCount: number
  totalCount: number
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
}: PreviewToolbarProps) {
  const { colors, mode } = usePreviewTheme()
  const searchActive = searchQuery.trim().length > 0
  const toolsActive = toolsExpanded || activeFilterCount > 0 || searchActive

  const summaryLines = useMemo(
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
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: colors.muted }}
          />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search producer or wine name…"
            aria-label="Search producer or wine name"
            className="w-full text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none"
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
      </div>

      <div
        className="px-3 pb-3 flex flex-col gap-1"
        style={{ color: colors.summaryText, fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11 }}
      >
        {summaryLines.map((line) => (
          <p key={line} style={{ margin: 0, lineHeight: 1.45 }}>
            {line}
          </p>
        ))}
      </div>

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
