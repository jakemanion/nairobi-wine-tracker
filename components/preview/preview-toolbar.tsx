'use client'

import { PreviewToolbarQuickFilters } from '@/components/preview/preview-toolbar-quick-filters'
import { UsageTipTarget } from '@/components/preview/usage-tip-target'
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
  const { colors, mode } = usePreviewTheme()
  const toolsActive = activeFilterCount > 0
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
      <div className="flex items-center gap-2 p-3 flex-wrap justify-end">
        {isLoggedIn ? (
          <UsageTipTarget tipId="hide-unwanted">
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
          </UsageTipTarget>
        ) : null}
      </div>

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
      <p
        className="m-0 px-3 pb-2 truncate"
        title={resultCountText}
        style={{
          color: colors.summaryText,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 9,
          lineHeight: 1.3,
        }}
      >
        {resultCountText}
      </p>
    </div>
  )
}
