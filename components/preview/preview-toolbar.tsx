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

function buildResultCountText(resultCount: number, totalCount: number): string {
  return resultCount === totalCount
    ? `Showing all ${resultCount} wines`
    : `Showing ${resultCount} of ${totalCount} wines`
}

type PreviewToolbarProps = {
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
  totalCount,
  priceBounds,
  isLoggedIn = false,
}: PreviewToolbarProps) {
  const { colors } = usePreviewTheme()
  const [filtersVisible, setFiltersVisible] = useState(true)
  const toolsActive = activeFilterCount > 0
  const resultCountText = buildResultCountText(resultCount, totalCount)

  return (
    <div>
      <div
        className="rounded-lg overflow-hidden"
        style={{
          border: `1px solid ${toolsActive ? colors.toolbarBorderActive : colors.toolbarBorder}`,
          background: colors.toolbarBg,
        }}
      >
        {filtersVisible ? (
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
            isLoggedIn={isLoggedIn}
          />
        ) : null}
        <div
          className="flex justify-center"
          style={{
            borderTop: filtersVisible ? `1px solid ${colors.toolbarBorder}` : undefined,
          }}
        >
          <button
            type="button"
            aria-expanded={filtersVisible}
            className="inline-flex items-center justify-center gap-1.5"
            style={{
              minHeight: 24,
              padding: '3px 12px',
              border: 0,
              background: 'transparent',
              color: colors.summaryText,
              cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 10,
              lineHeight: 1.2,
            }}
            onClick={() => setFiltersVisible((visible) => !visible)}
          >
            {filtersVisible ? (
              <ChevronUp size={12} aria-hidden />
            ) : (
              <ChevronDown size={12} aria-hidden />
            )}
            {filtersVisible ? 'Hide filters and sorting' : 'Show filters and sorting'}
          </button>
        </div>
      </div>
      <p
        className="m-0 px-1 pt-1 truncate"
        title={resultCountText}
        style={{
          color: colors.summaryText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 8,
          lineHeight: 1.2,
        }}
      >
        {resultCountText}
      </p>
    </div>
  )
}
