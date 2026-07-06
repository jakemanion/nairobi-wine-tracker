'use client'

import { useEffect, useMemo, useState } from 'react'
import { LogoutButton } from '@/components/auth/logout-button'
import { LoginNavLink } from '@/components/auth/login-nav-link'
import { RegisterNavLink } from '@/components/auth/register-nav-link'
import { PreviewToolbar } from '@/components/preview/preview-toolbar'
import { PreviewWineCard } from '@/components/preview/preview-wine-card'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
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
const USAGE_TIPS_STORAGE_KEY = 'wine-diviner-usage-tips-enabled'

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

function clearShortlistFromWines(wines: DisplayWineRow[]): DisplayWineRow[] {
  return wines.map((wine) => {
    if (!wine.review || wine.review.shortlist !== 1) return wine
    return { ...wine, review: { ...wine.review, shortlist: null } }
  })
}

export function PreviewWineList({
  wines: initialWines,
  isLoggedIn,
  userId,
  userName,
  userEmail,
}: PreviewWineListProps) {
  const { colors, mode } = usePreviewTheme()
  const [wines, setWines] = useState<DisplayWineRow[]>(() =>
    initialWines.map(withComputedValueScore),
  )
  const [filters, setFilters] = useState<WineFilters>(EMPTY_WINE_FILTERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'winery', dir: 'asc' })
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: 'none', dir: 'asc' })
  const [shortlistOnly, setShortlistOnly] = useState(false)
  const [usageTipsEnabled, setUsageTipsEnabled] = useState(true)

  useEffect(() => {
    if (!isLoggedIn) return
    try {
      const stored = window.localStorage.getItem(USAGE_TIPS_STORAGE_KEY)
      if (stored === 'off') setUsageTipsEnabled(false)
      if (stored === 'on') setUsageTipsEnabled(true)
    } catch {
      // Ignore storage access errors and keep defaults.
    }
  }, [isLoggedIn])

  function setUsageTips(next: boolean) {
    setUsageTipsEnabled(next)
    try {
      window.localStorage.setItem(USAGE_TIPS_STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // Ignore storage write errors and keep in-memory state.
    }
  }

  const filterOptions = useMemo(() => collectFilterOptions(wines), [wines])
  const priceBounds = useMemo(() => computeListPriceBounds(wines), [wines])
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  const shortlistedWines = useMemo(
    () => wines.filter((wine) => wine.review?.shortlist === 1),
    [wines],
  )

  const filtered = useMemo(() => {
    if (shortlistOnly) return shortlistedWines
    return filterWines(wines, filters)
  }, [wines, filters, shortlistOnly, shortlistedWines])
  const searchIndex = useMemo(() => createWineSearchIndex(filtered), [filtered])

  const searched = useMemo(() => {
    if (shortlistOnly || !hasActiveWineSearch(searchQuery)) return filtered
    return searchWinesFromIndex(searchIndex, searchQuery)
  }, [filtered, searchIndex, searchQuery, shortlistOnly])

  const sorted = useMemo(() => {
    if (hasActiveWineSearch(searchQuery)) return searched
    return sortWines(searched, primarySort, secondarySort)
  }, [searched, primarySort, secondarySort, searchQuery])

  const previewWines = useMemo(() => sorted.map(toPreviewWineCard), [sorted])

  return (
    <div className="min-h-screen" style={{ background: colors.pageBg }}>
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
            <div className="min-w-0">
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
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLoggedIn ? (
                <>
                  <span
                    className="text-[10px] truncate max-w-[14rem]"
                    style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
                    title={userEmail ? `${userName} · ${userEmail}` : userName}
                  >
                    {userEmail ? `${userName} · ${userEmail}` : userName}
                  </span>
                  <label
                    className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md"
                    style={{
                      color: colors.headerSub,
                      border: `1px solid ${colors.headerBorder}`,
                      background: colors.toolbarBg,
                      fontFamily: 'var(--font-dm-sans), sans-serif',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={usageTipsEnabled}
                      onChange={(event) => setUsageTips(event.target.checked)}
                      className="accent-[#C93048]"
                      aria-label="Toggle usage tips"
                    />
                    Tips
                  </label>
                  <LogoutButton theme={mode} />
                </>
              ) : (
                <>
                  <LoginNavLink theme={mode} nextPath="/" />
                  <RegisterNavLink theme={mode} />
                </>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto px-6 py-4" style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}>
          <PreviewToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            activeFilterCount={activeFilterCount}
            filters={filters}
            onFiltersChange={setFilters}
            filterOptions={filterOptions}
            primarySort={primarySort}
            onPrimarySortChange={setPrimarySort}
            onSecondarySortChange={setSecondarySort}
            resultCount={previewWines.length}
            totalCount={shortlistOnly ? shortlistedWines.length : wines.length}
            priceBounds={priceBounds}
            isLoggedIn={isLoggedIn}
            userId={userId}
            shortlistOnly={shortlistOnly}
            onShortlistOnlyChange={setShortlistOnly}
            onShortlistCleared={() => setWines((current) => clearShortlistFromWines(current))}
          />
        </div>
      </div>

      <main className="mx-auto px-6 py-5 space-y-2.5" style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH }}>
        {previewWines.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: colors.emptyText }}>
            {shortlistOnly ? 'No wines on your shortlist.' : 'No wines match your search or filters.'}
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
                usageTipsEnabled={isLoggedIn && usageTipsEnabled}
                onHideAllTips={() => setUsageTips(false)}
                onReviewChange={(review) =>
                  setWines((current) => updateWineReview(current, wine.id, review))
                }
              />
            )
          })
        )}
      </main>
    </div>
  )
}
