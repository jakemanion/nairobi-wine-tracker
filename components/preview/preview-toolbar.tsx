'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import {
  PreviewSortBar,
  PreviewToolbarQuickFilters,
} from '@/components/preview/preview-toolbar-quick-filters'
import type { SortCriterion } from '@/components/wine-filter-panel'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  type RegionFilterGroup,
  type WineFilters,
} from '@/lib/wine-filters'
import { buildListStateSummaryParts } from '@/lib/preview/list-state-summary'

type PreviewToolbarProps = {
  activeFilterCount: number
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  filterOptions: {
    stores: string[]
    grapes: string[]
    styles: string[]
    producers: string[]
    countries: string[]
    regions: string[]
    regionGroups: RegionFilterGroup[]
  }
  primarySort: SortCriterion
  onPrimarySortChange: (next: SortCriterion) => void
  onSecondarySortChange: (next: SortCriterion) => void
  resultCount: number
  priceBounds: { min: number; max: number; median: number } | null
  isLoggedIn?: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function PreviewToolbar({
  activeFilterCount,
  filters,
  onFiltersChange,
  filterOptions,
  primarySort,
  onPrimarySortChange,
  onSecondarySortChange,
  resultCount,
  priceBounds,
  isLoggedIn = false,
  searchQuery,
  onSearchChange,
}: PreviewToolbarProps) {
  const { colors, visualStyle } = usePreviewTheme()
  const [filtersVisible, setFiltersVisible] = useState(true)
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false)
  const toolsActive = activeFilterCount > 0
  const summaryParts = buildListStateSummaryParts({
    filters,
    resultCount,
    storeCount: filterOptions.stores.length,
    grapeCount: filterOptions.grapes.length,
    countryCount: filterOptions.countries.length,
    includeMyWines: isLoggedIn,
  })
  const summaryText = summaryParts.join(' · ')

  const summaryContent = summaryParts.map((part, index) => (
    <span key={`${index}-${part}`}>
      {index > 0 ? (
        <span aria-hidden style={{ color: '#555555', padding: '0 0.35em' }}>
          ·
        </span>
      ) : null}
      {part}
    </span>
  ))

  const mobileSearchRow = (
    <>
      <div className="relative min-w-0 flex-1 basis-0 max-w-[42%]">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          style={{ color: colors.searchPlaceholder }}
        />
        <input
          type="search"
          value={searchQuery}
          placeholder="Search"
          aria-label="Search producer or wine name"
          className="w-full py-1.5 pl-7 pr-2 text-sm focus:outline-none"
          style={{
            background: colors.searchBg,
            border: `1px solid ${colors.searchBorder}`,
            color: colors.searchText,
            borderRadius: colors.panelRadius,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <button
        type="button"
        aria-expanded={mobileTabsOpen}
        aria-controls="preview-filter-tabs"
        onClick={() => setMobileTabsOpen((open) => !open)}
        className="inline-flex flex-shrink-0 items-center gap-1"
        style={{
          height: 34,
          padding: '0 8px',
          fontSize: 11,
          lineHeight: 1.2,
          borderRadius: colors.panelRadius,
          cursor: 'pointer',
          fontFamily: 'var(--font-dm-sans), sans-serif',
          background: mobileTabsOpen || toolsActive ? '#ffffff' : colors.buttonBg,
          border: `1px solid ${
            mobileTabsOpen || toolsActive ? colors.accent : colors.buttonBorder
          }`,
          color: colors.summaryStrong,
          whiteSpace: 'nowrap',
        }}
      >
        <SlidersHorizontal size={13} strokeWidth={2} aria-hidden />
        Filters
        {activeFilterCount > 0 ? (
          <span aria-hidden style={{ color: colors.accent, fontWeight: 700 }}>
            {activeFilterCount}
          </span>
        ) : null}
      </button>
      <div className="flex-shrink-0">
        <PreviewSortBar
          colors={colors}
          primarySort={primarySort}
          onPrimarySortChange={onPrimarySortChange}
          onSecondarySortChange={onSecondarySortChange}
          compact
        />
      </div>
    </>
  )

  return (
    <div>
      <div
        id="preview-filter-panel"
        className={`preview-filter-panel-shell overflow-hidden ${
          filtersVisible ? '' : 'hidden max-sm:!block'
        }`}
        style={{
          border: `1px solid ${
            visualStyle === 'trial'
              ? colors.cardBorder
              : toolsActive
                ? colors.toolbarBorderActive
                : colors.toolbarBorder
          }`,
          background: colors.toolbarBg,
          borderRadius: colors.panelRadius,
          boxShadow: visualStyle === 'trial' ? colors.cardShadow : undefined,
        }}
      >
        <PreviewToolbarQuickFilters
          colors={colors}
          filters={filters}
          onFiltersChange={onFiltersChange}
          stores={filterOptions.stores}
          grapes={filterOptions.grapes}
          styles={filterOptions.styles}
          countries={filterOptions.countries}
          priceBounds={priceBounds}
          primarySort={primarySort}
          onPrimarySortChange={onPrimarySortChange}
          onSecondarySortChange={onSecondarySortChange}
          isLoggedIn={isLoggedIn}
          tabsOpen={mobileTabsOpen}
          mobileSearchRow={mobileSearchRow}
        />
      </div>

      {/* Mobile: summary on its own full-width row */}
      <p
        className="m-0 w-full min-w-0 pt-1.5 text-center sm:hidden"
        title={summaryText}
        style={{
          color: colors.summaryText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 10,
          lineHeight: 1.2,
          overflowWrap: 'anywhere',
        }}
      >
        {summaryContent}
      </p>

      {/* Desktop: sort | summary | hide filters */}
      <div
        className={`hidden min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-2 px-1 sm:grid ${
          filtersVisible ? 'pt-1.5' : ''
        }`}
      >
        <div className="justify-self-start self-center">
          <PreviewSortBar
            colors={colors}
            primarySort={primarySort}
            onPrimarySortChange={onPrimarySortChange}
            onSecondarySortChange={onSecondarySortChange}
          />
        </div>
        <p
          className="m-0 min-w-0 self-center text-center"
          title={summaryText}
          style={{
            color: colors.summaryText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 10,
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}
        >
          {summaryContent}
        </p>
        <button
          type="button"
          aria-expanded={filtersVisible}
          aria-controls="preview-filter-panel"
          onClick={() => setFiltersVisible((visible) => !visible)}
          className="justify-self-end self-center"
          style={{
            height: 22,
            padding: '0 8px',
            fontSize: 10,
            lineHeight: 1.2,
            borderRadius: colors.panelRadius,
            cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            background: '#ffffff',
            border: `1px solid ${colors.accent}`,
            color: colors.summaryStrong,
            whiteSpace: 'nowrap',
          }}
        >
          {filtersVisible ? 'Hide filters' : 'Show filters'}
        </button>
      </div>
    </div>
  )
}
