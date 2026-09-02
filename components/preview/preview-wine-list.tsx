'use client'

import { useMemo, useState } from 'react'
import { Search, Share2 } from 'lucide-react'
import { LoginNavLink } from '@/components/auth/login-nav-link'
import { RegisterNavLink } from '@/components/auth/register-nav-link'
import { PreviewToolbar } from '@/components/preview/preview-toolbar'
import { PreviewUserMenu } from '@/components/preview/preview-user-menu'
import { PreviewWineCard } from '@/components/preview/preview-wine-card'
import { ShareListsModal } from '@/components/preview/share-lists-modal'
import { UsageTipsProvider } from '@/components/preview/usage-tips-context'
import { UsageTipsToggle } from '@/components/preview/usage-tips-toggle'
import { VisualStyleToggle } from '@/components/preview/visual-style-toggle'
import { WelcomePanel } from '@/components/preview/welcome-panel'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { SiteFooter } from '@/components/site-footer'
import type { SortCriterion } from '@/components/wine-filter-panel'
import type { WineReview, WineRow } from '@/components/wine-table'
import { sortWines } from '@/components/wine-table'
import { withComputedValueScore } from '@/lib/calculate-value-score'
import {
  collectFilterOptions,
  computeListPriceBounds,
  countActiveFilters,
  EMPTY_WINE_FILTERS,
  filterWines,
  type WineFilters,
} from '@/lib/wine-filters'
import { toPreviewWineCard } from '@/lib/preview/wine-card-model'
import { createWineSearchIndex, hasActiveWineSearch, searchWinesFromIndex } from '@/lib/wine-search'

type DisplayWineRow = WineRow & { valueScore: number | null }

const PREVIEW_CONTENT_MAX_WIDTH = '54.625rem'

type PreviewWineListProps = {
  wines: WineRow[]
  isLoggedIn: boolean
  userId: string
  userName: string
  userEmail: string
}

const EAGER_IMAGE_COUNT = 30

function updateWineReview(
  wines: DisplayWineRow[],
  wineId: string,
  review: WineReview | null,
): DisplayWineRow[] {
  return wines.map((wine) =>
    wine.id === wineId || String(wine.id) === wineId
      ? { ...wine, review: review ?? undefined }
      : wine,
  )
}

export function PreviewWineList({
  wines: initialWines,
  isLoggedIn,
  userId,
  userName,
  userEmail,
}: PreviewWineListProps) {
  const { colors, visualStyle } = usePreviewTheme()
  const [wines, setWines] = useState<DisplayWineRow[]>(() =>
    initialWines.map(withComputedValueScore),
  )
  const [filters, setFilters] = useState<WineFilters>(EMPTY_WINE_FILTERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'value_score', dir: 'desc' })
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: 'none', dir: 'asc' })
  const [shareOpen, setShareOpen] = useState(false)
  const filterOptions = useMemo(() => collectFilterOptions(wines), [wines])
  const priceBounds = useMemo(() => computeListPriceBounds(wines), [wines])
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  const filtered = useMemo(() => filterWines(wines, filters), [wines, filters])
  const searchIndex = useMemo(() => createWineSearchIndex(filtered), [filtered])

  const searched = useMemo(() => {
    if (!hasActiveWineSearch(searchQuery)) return filtered
    return searchWinesFromIndex(searchIndex, searchQuery)
  }, [filtered, searchIndex, searchQuery])

  const sorted = useMemo(() => {
    if (hasActiveWineSearch(searchQuery)) return searched
    return sortWines(searched, primarySort, secondarySort)
  }, [searched, primarySort, secondarySort, searchQuery])

  const previewWines = useMemo(() => sorted.map(toPreviewWineCard), [sorted])

  return (
    <UsageTipsProvider>
      <div
      className="min-h-screen flex flex-col"
      data-visual-style={visualStyle}
      style={{ background: colors.pageBg }}
    >
      <div
        className="sticky top-0 z-50"
        style={{
          background: colors.pageBg,
          borderBottom: `1px solid ${colors.headerBorder}`,
          boxShadow: colors.headerShadow,
        }}
      >
        <header
          style={{
            background: colors.headerBg,
            borderBottom: `1px solid ${colors.headerBorder}`,
          }}
        >
          <div className="mx-auto px-6 py-3 flex items-center justify-between gap-4" style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}>
            <div className="min-w-0 flex-shrink-0">
              <h1
                className="text-base font-semibold leading-none truncate"
                style={{ color: colors.headerTitle, fontFamily: 'var(--font-playfair), serif' }}
              >
                WineDiviner: Nairobi
              </h1>
              <p className="text-[10px] mt-1 truncate" style={{ color: colors.headerSub }}>
                Find Nairobi&apos;s best wine for your money
              </p>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: colors.muted }}
              />
              <input
                type="search"
                value={searchQuery}
                placeholder="Search wines…"
                aria-label="Search producer or wine name"
                className="w-full text-sm pl-8 pr-3 py-1.5 focus:outline-none"
                style={{
                  background: colors.searchBg,
                  border: `1px solid ${colors.searchBorder}`,
                  color: colors.searchText,
                  borderRadius: colors.panelRadius,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLoggedIn ? (
                <>
                  <VisualStyleToggle colors={colors} />
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5"
                    style={{
                      background: colors.buttonBg,
                      border: `1px solid ${colors.buttonBorder}`,
                      color: colors.buttonText,
                      borderRadius: colors.panelRadius,
                      fontFamily: 'var(--font-dm-sans), sans-serif',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 size={13} strokeWidth={2} />
                    Share
                  </button>
                  <PreviewUserMenu
                    colors={colors}
                    theme={colors.headerNavTheme}
                    userName={userName}
                    userEmail={userEmail}
                    onShareClick={() => setShareOpen(true)}
                  />
                </>
              ) : (
                <>
                    <VisualStyleToggle colors={colors} />
                  <UsageTipsToggle colors={colors} />
                  <LoginNavLink theme={colors.headerNavTheme} nextPath="/" />
                  <RegisterNavLink theme={colors.headerNavTheme} />
                </>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto px-6 py-4" style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}>
          <PreviewToolbar
            activeFilterCount={activeFilterCount}
            filters={filters}
            onFiltersChange={setFilters}
            filterOptions={filterOptions}
            primarySort={primarySort}
            onPrimarySortChange={setPrimarySort}
            onSecondarySortChange={setSecondarySort}
            searchQuery={searchQuery}
            secondarySort={secondarySort}
            resultCount={previewWines.length}
            totalCount={wines.length}
            priceBounds={priceBounds}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>

      <main className="mx-auto px-6 py-5 space-y-2.5 flex-1 w-full" style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}>
        <WelcomePanel />
        {previewWines.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: colors.emptyText }}>
            No wines match your search or filters.
          </p>
        ) : (
          previewWines.map((wine, index) => {
            const source = wines.find((row) => String(row.id) === wine.id)
            return (
              <PreviewWineCard
                key={wine.id}
                wine={wine}
                isLoggedIn={isLoggedIn}
                userId={userId}
                review={isLoggedIn ? source?.review : undefined}
                imagePriority={index < EAGER_IMAGE_COUNT}
                onReviewChange={(review) =>
                  setWines((current) => updateWineReview(current, wine.id, review))
                }
              />
            )
          })
        )}
      </main>
      <SiteFooter colors={colors} />
      </div>
      {isLoggedIn ? (
        <ShareListsModal open={shareOpen} onClose={() => setShareOpen(false)} />
      ) : null}
    </UsageTipsProvider>
  )
}
