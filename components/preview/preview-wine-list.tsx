'use client'

import { useMemo, useState } from 'react'
import { LogoutButton } from '@/components/auth/logout-button'
import { LoginNavLink } from '@/components/auth/login-nav-link'
import { RegisterNavLink } from '@/components/auth/register-nav-link'
import { ClearShortlistButton } from '@/components/clear-shortlist-button'
import { ShowShortlistOnlyButton } from '@/components/show-shortlist-only-button'
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
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'winery', dir: 'asc' })
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: 'none', dir: 'asc' })
  const [shortlistOnly, setShortlistOnly] = useState(false)

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

  const ratingThenPriceActive =
    primarySort.key === 'vivino_rating' &&
    primarySort.dir === 'desc' &&
    secondarySort.key === 'store_prices' &&
    secondarySort.dir === 'asc'

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
                {isLoggedIn
                  ? userEmail
                    ? `${userName} · ${userEmail}`
                    : userName
                  : 'Sign in to save your reviews'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isLoggedIn ? (
                <>
                  <ShowShortlistOnlyButton
                    active={shortlistOnly}
                    theme={mode}
                    onChange={setShortlistOnly}
                  />
                  <ClearShortlistButton
                    userId={userId}
                    theme={mode}
                    onCleared={() => setWines((current) => clearShortlistFromWines(current))}
                  />
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
            toolsExpanded={toolsExpanded}
            onToolsExpandedChange={setToolsExpanded}
            activeFilterCount={activeFilterCount}
            filters={filters}
            onFiltersChange={setFilters}
            filterOptions={filterOptions}
            primarySort={primarySort}
            secondarySort={secondarySort}
            onPrimarySortChange={setPrimarySort}
            onSecondarySortChange={setSecondarySort}
            ratingThenPriceActive={ratingThenPriceActive}
            onApplyRatingThenPrice={() => {
              setPrimarySort({ key: 'vivino_rating', dir: 'desc' })
              setSecondarySort({ key: 'store_prices', dir: 'asc' })
            }}
            resultCount={previewWines.length}
            totalCount={shortlistOnly ? shortlistedWines.length : wines.length}
            priceBounds={priceBounds}
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
