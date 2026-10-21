'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Share2 } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { LoginNavLink } from '@/components/auth/login-nav-link'
import { RegisterNavLink } from '@/components/auth/register-nav-link'
import { AdminVersionBadge } from '@/components/preview/admin-version-badge'
import { PreviewToolbar } from '@/components/preview/preview-toolbar'
import { PreviewLegalMenu } from '@/components/preview/preview-legal-menu'
import { PreviewMobileListFooter } from '@/components/preview/preview-mobile-list-footer'
import {
  MobileMyWineMarkToastSlot,
  MyWineMarkToastProvider,
} from '@/components/preview/my-wine-mark-toast'
import { PreviewUserMenu } from '@/components/preview/preview-user-menu'
import { PreviewVirtualWineList } from '@/components/preview/preview-virtual-wine-list'
import { ShareListsModal } from '@/components/preview/share-lists-modal'
import { GettingStartedOnboarding } from '@/components/preview/getting-started-onboarding'
import { UsageTipsProvider } from '@/components/preview/usage-tips-context'
import { UsageTipsToggle } from '@/components/preview/usage-tips-toggle'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { SiteFooter } from '@/components/site-footer'
import type { SortCriterion } from '@/components/wine-filter-panel'
import type { WineReview, WineRow } from '@/components/wine-table'
import { sortWines } from '@/components/wine-table'
import { withComputedValueScore } from '@/lib/calculate-value-score'
import { trackEvent } from '@/lib/analytics'
import {
  collectFilterOptions,
  computeListPriceBounds,
  countActiveFilters,
  EMPTY_WINE_FILTERS,
  type WineFilters,
} from '@/lib/wine-filters'
import { toPreviewWineCard } from '@/lib/preview/wine-card-model'
import { selectWinesForList } from '@/lib/wine-list-query'
import {
  createWineSearchIndex,
  hasActiveWineSearch,
  normalizeSearchText,
} from '@/lib/wine-search'

type DisplayWineRow = WineRow & { valueScore: number | null }

const PREVIEW_CONTENT_MAX_WIDTH = '54.625rem'
/** Matches analytics debounce; filters clear only when this applied search updates. */
const SEARCH_APPLY_DEBOUNCE_MS = 600

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
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('')
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'value_score', dir: 'desc' })
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: 'none', dir: 'asc' })
  const [shareOpen, setShareOpen] = useState(false)
  const appliedSearchNormalizedRef = useRef(normalizeSearchText(''))
  const filterOptions = useMemo(() => collectFilterOptions(wines), [wines])
  const priceBounds = useMemo(() => computeListPriceBounds(wines), [wines])
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  // Commit search after debounce (immediate when cleared). A new/cleared search resets filters
  // in the same update so results never briefly apply old filters to the new query.
  useEffect(() => {
    const delay = searchQuery.trim() === '' ? 0 : SEARCH_APPLY_DEBOUNCE_MS
    const timer = window.setTimeout(() => {
      const normalized = normalizeSearchText(searchQuery)
      if (normalized !== appliedSearchNormalizedRef.current) {
        appliedSearchNormalizedRef.current = normalized
        setFilters(EMPTY_WINE_FILTERS)
      }
      setAppliedSearchQuery((current) => (current === searchQuery ? current : searchQuery))
    }, delay)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const searchIndex = useMemo(() => createWineSearchIndex(wines), [wines])

  const filtered = useMemo(
    () => selectWinesForList(wines, appliedSearchQuery, filters, searchIndex),
    [appliedSearchQuery, filters, searchIndex, wines],
  )

  const sorted = useMemo(() => {
    if (hasActiveWineSearch(appliedSearchQuery)) return filtered
    return sortWines(filtered, primarySort, secondarySort)
  }, [appliedSearchQuery, filtered, primarySort, secondarySort])

  const previewWines = useMemo(() => sorted.map(toPreviewWineCard), [sorted])

  useEffect(() => {
    if (!hasActiveWineSearch(appliedSearchQuery)) return
    trackEvent('wine_searched', {
      result_count: filtered.length,
      query_length: appliedSearchQuery.trim().length,
    })
  }, [appliedSearchQuery, filtered.length])

  function handleFiltersChange(next: WineFilters) {
    setFilters(next)
    trackEvent('wine_filter_used', {
      active_filter_count: countActiveFilters(next),
      include_unmarked: next.includeUnmarked,
      include_bookmarked: next.includeBookmarked,
      include_buy_again: next.includeBuyAgain,
      include_dont_buy_again: next.includeDontBuyAgain,
      include_hidden: next.includeHidden,
      has_price_max: Boolean(next.priceMax.trim()),
      style_count: next.styles.length,
      grape_count: next.grapes.length,
      region_count: next.regions.length,
      disabled_store_count: next.disabledStores.length,
    })
  }

  function handlePrimarySortChange(next: SortCriterion) {
    setPrimarySort(next)
    trackEvent('wine_sorted', {
      sort_key: next.key,
      sort_dir: next.dir,
    })
  }

  const winesById = useMemo(() => {
    const map = new Map<string, WineRow>()
    for (const wine of wines) {
      map.set(String(wine.id), wine)
    }
    return map
  }, [wines])

  const listGapPx = visualStyle === 'trial' ? 20 : 10
  const listResetKey = [
    appliedSearchQuery,
    JSON.stringify(filters),
    primarySort.key,
    primarySort.dir,
    secondarySort.key,
    secondarySort.dir,
  ].join('|')

  const listBody = (
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
                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: visualStyle === 'trial' ? '#FFFFFF' : colors.headerAccent,
                      border: `1px solid ${colors.buttonBorder}`,
                      color: visualStyle === 'trial' ? colors.headerTitle : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 size={15} strokeWidth={2} fill="none" />
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
          className="mx-auto px-3 pt-0 pb-0 sm:pt-2 sm:pb-4 sm:pl-10 sm:pr-6"
          style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}
        >
          <PreviewToolbar
            activeFilterCount={activeFilterCount}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            filterOptions={filterOptions}
            primarySort={primarySort}
            onPrimarySortChange={handlePrimarySortChange}
            onSecondarySortChange={setSecondarySort}
            resultCount={previewWines.length}
            priceBounds={priceBounds}
            isLoggedIn={isLoggedIn}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        <MobileMyWineMarkToastSlot maxWidth={PREVIEW_CONTENT_MAX_WIDTH} />
      </div>

      <main
        className="mx-auto flex w-full flex-1 flex-col py-5 pl-7 pr-3 sm:pl-10 sm:pr-6"
        style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH, gap: listGapPx }}
      >
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
      {isLoggedIn ? (
        <PreviewMobileListFooter
          colors={colors}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoggedIn
        />
      ) : null}
      <GettingStartedOnboarding
        filters={filters}
        onFiltersChange={handleFiltersChange}
        styles={filterOptions.styles}
        primarySort={primarySort}
        onPrimarySortChange={handlePrimarySortChange}
        onSecondarySortChange={setSecondarySort}
      />
      <SiteFooter colors={colors} />
      </div>
  )

  return (
    <UsageTipsProvider>
      {isLoggedIn ? (
        <MyWineMarkToastProvider
          userId={userId}
          filters={filters}
          onReviewRestored={(wineId, review) =>
            setWines((current) => updateWineReview(current, wineId, review))
          }
        >
          {listBody}
          <ShareListsModal open={shareOpen} onClose={() => setShareOpen(false)} />
        </MyWineMarkToastProvider>
      ) : (
        listBody
      )}
    </UsageTipsProvider>
  )
}
