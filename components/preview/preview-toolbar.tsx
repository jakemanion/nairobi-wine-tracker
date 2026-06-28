'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import { WineFilterPanel, type SortCriterion } from '@/components/wine-filter-panel'
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
  const searchActive = searchQuery.trim().length > 0
  const toolsActive = toolsExpanded || activeFilterCount > 0 || searchActive

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${toolsActive ? '#4A3848' : '#3A3848'}`,
        background: '#1A1A22',
        boxShadow: toolsExpanded ? '0 4px 20px rgba(0,0,0,0.35)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 p-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: '#6A6878' }}
          />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search producer or wine name…"
            aria-label="Search producer or wine name"
            className="w-full text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none"
            style={{
              background: '#14141A',
              border: '1px solid #3A3848',
              color: '#EDE8E0',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all flex-shrink-0"
          style={{
            background: toolsExpanded ? '#2A2230' : '#14141A',
            border: `1px solid ${activeFilterCount > 0 ? '#C93048' : '#3A3848'}`,
            color: toolsExpanded || activeFilterCount > 0 ? '#EDE8E0' : '#8A8898',
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
              background: '#14141A',
              border: '1px solid #3A3848',
              color: '#8A8898',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
            onClick={() => onSearchQueryChange('')}
          >
            Clear search
          </button>
        ) : null}
      </div>

      <div
        className="px-3 pb-2 text-[11px]"
        style={{ color: '#6A6878', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        Showing <strong style={{ color: '#B8B4AC' }}>{resultCount}</strong>
        {resultCount !== totalCount ? (
          <>
            {' '}
            of <strong style={{ color: '#B8B4AC' }}>{totalCount}</strong>
          </>
        ) : null}{' '}
        wines
        {searchActive ? (
          <>
            {' '}
            matching &ldquo;{searchQuery.trim()}&rdquo;
          </>
        ) : null}
      </div>

      {toolsExpanded ? (
        <div style={{ borderTop: '1px solid #2E2E3A' }}>
          <WineFilterPanel
            embedded
            theme="dark"
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
