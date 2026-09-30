'use client'

import { useState } from 'react'
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
}: PreviewToolbarProps) {
  const { colors, visualStyle } = usePreviewTheme()
  const [filtersVisible, setFiltersVisible] = useState(true)
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

  return (
    <div>
      <div
        id="preview-filter-panel"
        className="overflow-hidden"
        hidden={!filtersVisible}
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
        />
      </div>
      <div
        className={`grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-2 px-1 ${filtersVisible ? 'pt-1.5' : ''}`}
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
          className="m-0 min-w-0 text-center self-center"
          title={summaryText}
          style={{
            color: colors.summaryText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 10,
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}
        >
          {summaryParts.map((part, index) => (
            <span key={`${index}-${part}`}>
              {index > 0 ? (
                <span aria-hidden style={{ color: '#555555', padding: '0 0.35em' }}>
                  ·
                </span>
              ) : null}
              {part}
            </span>
          ))}
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
