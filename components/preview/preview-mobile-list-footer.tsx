'use client'

import { MyWinesFilterBar } from '@/components/preview/preview-toolbar-quick-filters'
import type { PreviewColors } from '@/lib/preview/preview-colors'
import type { WineFilters } from '@/lib/wine-filters'

type PreviewMobileListFooterProps = {
  colors: PreviewColors
  filters: WineFilters
  onFiltersChange: (filters: WineFilters) => void
  isLoggedIn: boolean
}

/** Fixed mobile footer: Show filters when logged in. */
export function PreviewMobileListFooter({
  colors,
  filters,
  onFiltersChange,
  isLoggedIn,
}: PreviewMobileListFooterProps) {
  if (!isLoggedIn) return null

  return (
    <div className="sm:hidden">
      <div className="h-[5.5rem] shrink-0" aria-hidden />
      <footer
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: colors.headerBg,
          borderTop: `1px solid ${colors.headerBorder}`,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
        }}
      >
        <div className="mx-auto pt-1.5" style={{ maxWidth: '54.625rem' }}>
          <MyWinesFilterBar
            colors={colors}
            filters={filters}
            onFiltersChange={onFiltersChange}
            showLabels
          />
        </div>
      </footer>
    </div>
  )
}
