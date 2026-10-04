'use client'

import { useMemo, useState } from 'react'
import { Search, Share2 } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { LoginNavLink } from '@/components/auth/login-nav-link'
import { RegisterNavLink } from '@/components/auth/register-nav-link'
import { AdminVersionBadge } from '@/components/preview/admin-version-badge'
import { PreviewToolbar } from '@/components/preview/preview-toolbar'
import { PreviewLegalMenu } from '@/components/preview/preview-legal-menu'
import { PreviewMobileListFooter } from '@/components/preview/preview-mobile-list-footer'
import { PreviewUserMenu } from '@/components/preview/preview-user-menu'
import { PreviewVirtualWineList } from '@/components/preview/preview-virtual-wine-list'
import { ShareListsModal } from '@/components/preview/share-lists-modal'
import { UsageTipsProvider } from '@/components/preview/usage-tips-context'
import { UsageTipsToggle } from '@/components/preview/usage-tips-toggle'
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
  isAdmin?: boolean
  userId: string
  userName: string
  userEmail: string
  reportedWineIds?: string[]
}

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
  isAdmin = false,
  userId,
  userName,
  userEmail,
  reportedWineIds = [],
}: PreviewWineListProps) {
  const { colors, visualStyle } = usePreviewTheme()
  const [wines, setWines] = useState<DisplayWineRow[]>(() =>
    initialWines.map(withComputedValueScore),
  )
  const reportedWineIdSet = useMemo(() => new Set(reportedWineIds), [reportedWineIds])
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

  const winesById = useMemo(() => {
    const map = new Map<string, WineRow>()
    for (const wine of wines) {
      map.set(String(wine.id), wine)
    }
    return map
  }, [wines])

  const listGapPx = visualStyle === 'trial' ? 20 : 10
  const listResetKey = [
    searchQuery,
    JSON.stringify(filters),
    primarySort.key,
    primarySort.dir,
    secondarySort.key,
    secondarySort.dir,
  ].join('|')

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
          <div
            className="mx-auto flex items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:pl-10 sm:pr-6"
            style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}
          >
            <div className="flex min-w-0 flex-shrink-0 items-center gap-2.5">
              <BrandLogo height={40} />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1
                    className="truncate text-base font-semibold leading-none"
                    style={{ color: colors.headerTitle, fontFamily: colors.headingFont }}
                  >
                    WineDiviner: Nairobi
                  </h1>
                  {isAdmin ? <AdminVersionBadge colors={colors} /> : null}
                </div>
                <p className="mt-1 truncate text-[10px]" style={{ color: colors.headerSub }}>
                  Find Nairobi&apos;s best bottles for your budget
                </p>
              </div>
            </div>
            <div className="relative hidden max-w-xs flex-1 sm:block">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: colors.searchPlaceholder }}
              />
              <input
                type="search"
                value={searchQuery}
                placeholder="Search wine names"
                aria-label="Search wine names"
                className="w-full py-1.5 pl-8 pr-3 text-sm focus:outline-none"
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
            <div className="flex flex-shrink-0 items-center gap-2">
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    aria-label="Share your list"
                    title="Share your list"
                    className="inline-flex items-center gap-1.5 px-1.5 py-1.5 text-[11px] sm:px-2.5"
                    style={{
                      background: colors.buttonBg,
                      border: `1px solid ${colors.buttonBorder}`,
                      color: colors.buttonText,
                      borderRadius: colors.buttonRadius,
                      fontFamily: 'var(--font-dm-sans), sans-serif',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 size={13} strokeWidth={2} fill="none" />
                    <span className="hidden sm:inline">Share your list</span>
                  </button>
                  <PreviewUserMenu
                    colors={colors}
                    theme={colors.headerNavTheme}
                    userName={userName}
                    userEmail={userEmail}
                  />
                </>
              ) : (
                <>
                  <UsageTipsToggle colors={colors} />
                  <PreviewLegalMenu colors={colors} />
                  <LoginNavLink theme={colors.headerNavTheme} nextPath="/" />
                  <RegisterNavLink theme={colors.headerNavTheme} />
                </>
              )}
            </div>
          </div>
        </header>

        <div
          className="mx-auto px-3 pt-1 pb-4 sm:pt-2 sm:pl-10 sm:pr-6"
          style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}
        >
          <PreviewToolbar
            activeFilterCount={activeFilterCount}
            filters={filters}
            onFiltersChange={setFilters}
            filterOptions={filterOptions}
            primarySort={primarySort}
            onPrimarySortChange={setPrimarySort}
            onSecondarySortChange={setSecondarySort}
            resultCount={previewWines.length}
            priceBounds={priceBounds}
            isLoggedIn={isLoggedIn}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>

      <main
        className="mx-auto flex w-full flex-1 flex-col py-5 pl-7 pr-3 sm:pl-10 sm:pr-6"
        style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH, gap: listGapPx }}
      >
        <WelcomePanel />
        {previewWines.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: colors.emptyText }}>
            No wines match your search or filters.
          </p>
        ) : (
          <PreviewVirtualWineList
            previewWines={previewWines}
            winesById={winesById}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            userId={userId}
            gapPx={listGapPx}
            resetKey={listResetKey}
            reportedWineIds={reportedWineIdSet}
            onReviewChange={(wineId, review) =>
              setWines((current) => updateWineReview(current, wineId, review))
            }
          />
        )}
      </main>
      <PreviewMobileListFooter
        colors={colors}
        filters={filters}
        onFiltersChange={setFilters}
        isLoggedIn={isLoggedIn}
      />
      <SiteFooter colors={colors} />
      </div>
      {isLoggedIn ? (
        <ShareListsModal open={shareOpen} onClose={() => setShareOpen(false)} />
      ) : null}
    </UsageTipsProvider>
  )
}
