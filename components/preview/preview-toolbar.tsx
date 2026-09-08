'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { PreviewToolbarQuickFilters } from '@/components/preview/preview-toolbar-quick-filters'
import type { SortCriterion } from '@/components/wine-filter-panel'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  type RegionFilterGroup,
  type WineFilters,
} from '@/lib/wine-filters'
import { buildListStateSummary } from '@/lib/preview/list-state-summary'

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
  searchQuery: string
  secondarySort: SortCriterion
  resultCount: number
  totalCount: number
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
  searchQuery,
  secondarySort,
  resultCount,
  totalCount,
  priceBounds,
  isLoggedIn = false,
}: PreviewToolbarProps) {
  const { colors, visualStyle } = usePreviewTheme()
  const [advancedVisible, setAdvancedVisible] = useState(false)
  const toolsActive = activeFilterCount > 0
  const summaryText = buildListStateSummary({
    filters,
    searchQuery,
    primarySort,
    secondarySort,
    resultCount,
    totalCount,
  })

  return (
    <div>
      <div
        className="overflow-hidden"
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
          showAdvanced={advancedVisible}
        />
        <div
          className="flex"
          style={{
            borderTop: `1px solid ${colors.toolbarBorder}`,
          }}
        >
          <button
            type="button"
            aria-expanded={advancedVisible}
            className="inline-flex w-full items-center justify-center gap-1.5"
            style={{
              minHeight: 28,
              padding: '6px 12px',
              border: 0,
              background: 'transparent',
              color: colors.summaryText,
              cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 10,
              lineHeight: 1.2,
            }}
            onClick={() => setAdvancedVisible((visible) => !visible)}
          >
            {advancedVisible ? (
              <ChevronUp size={12} aria-hidden />
            ) : (
              <ChevronDown size={12} aria-hidden />
            )}
            {advancedVisible ? 'Hide advanced filters' : 'Show advanced filters'}
          </button>
        </div>
      </div>
      <p
        className="m-0 px-1 pt-1 truncate"
        title={summaryText}
        style={{
          color: colors.summaryText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 8,
          lineHeight: 1.2,
        }}
      >
        {summaryText}
      </p>
    </div>
  )
}
