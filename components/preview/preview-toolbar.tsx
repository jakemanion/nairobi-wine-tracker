'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import {
  FILTER_CONTROL_HEIGHT,
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
      <div className="relative w-[31.5%] min-w-0 flex-none">
        <Search
          className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2"
          style={{ color: colors.searchPlaceholder }}
        />
        <input
          type="search"
          value={searchQuery}
          placeholder="Search wine names"
          aria-label="Search wine names"
          className="box-border w-full pl-6 pr-1.5 text-[10px] leading-none focus:outline-none"
          style={{
            height: FILTER_CONTROL_HEIGHT,
            background: colors.searchBg,
            border: `1px solid ${colors.searchBorder}`,
            color: colors.searchText,
            borderRadius: colors.panelRadius,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <button
          type="button"
          aria-expanded={mobileTabsOpen}
          aria-controls="preview-filter-tabs"
          onClick={() => setMobileTabsOpen((open) => !open)}
          className="inline-flex flex-shrink-0 items-center gap-1"
          style={{
            height: FILTER_CONTROL_HEIGHT,
            padding: '0 7px',
            fontSize: 10,
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
          <SlidersHorizontal size={11} strokeWidth={2} aria-hidden />
          Filters
          {activeFilterCount > 0 ? (
            <span aria-hidden style={{ color: colors.accent, fontWeight: 700 }}>
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>
      <div className="flex flex-none items-center justify-end">
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
