'use client'

import { MyWinesFilterBar } from '@/components/preview/preview-toolbar-quick-filters'
import { buildListStateSummaryParts } from '@/lib/preview/list-state-summary'
import type { PreviewColors } from '@/lib/preview/preview-colors'
import type { WineFilters } from '@/lib/wine-filters'

type PreviewMobileListFooterProps = {
  colors: PreviewColors
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  resultCount: number
  storeCount: number
  grapeCount: number
  countryCount: number
  isLoggedIn: boolean
}

/** Fixed mobile footer: optional My wines filters + filter summary. */
export function PreviewMobileListFooter({
  colors,
  filters,
  onFiltersChange,
  resultCount,
  storeCount,
  grapeCount,
  countryCount,
  isLoggedIn,
}: PreviewMobileListFooterProps) {
  const summaryParts = buildListStateSummaryParts({
    filters,
    resultCount,
    storeCount,
    grapeCount,
    countryCount,
    includeMyWines: isLoggedIn,
  })
  const summaryText = summaryParts.join(' · ')

  return (
    <div className="sm:hidden">
      <div className={`shrink-0 ${isLoggedIn ? 'h-[4.75rem]' : 'h-8'}`} aria-hidden />
      <footer
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: colors.headerBg,
          borderTop: `1px solid ${colors.headerBorder}`,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
        }}
      >
        <div className="mx-auto flex flex-col gap-1.5 px-3 py-2" style={{ maxWidth: '54.625rem' }}>
          {isLoggedIn ? (
            <MyWinesFilterBar
              colors={colors}
              filters={filters}
              onFiltersChange={onFiltersChange}
              showLabels
            />
          ) : null}
          <p
            className="m-0 w-full min-w-0 text-center"
            title={summaryText}
            style={{
              color: colors.summaryText,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: 8,
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
        </div>
      </footer>
    </div>
  )
}
