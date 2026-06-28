'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Wine } from 'lucide-react'
import { PreviewToolbar } from '@/components/preview/preview-toolbar'
import { PreviewWineCard } from '@/components/preview/preview-wine-card'
import type { SortCriterion } from '@/components/wine-filter-panel'
import type { WineReview, WineRow } from '@/components/wine-table'
import { sortWines } from '@/components/wine-table'
import { withComputedValueScore } from '@/lib/calculate-value-score'
import {
  collectFilterOptions,
  countActiveFilters,
  EMPTY_WINE_FILTERS,
  filterWines,
  type WineFilters,
} from '@/lib/wine-filters'
import { countWinesByColour, toPreviewWineCard } from '@/lib/preview/wine-card-model'
import { createWineSearchIndex, normalizeSearchText } from '@/lib/wine-search'

type DisplayWineRow = WineRow & { valueScore: number | null }

type PreviewWineListProps = {
  wines: WineRow[]
  userId: string
  userName: string
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

export function PreviewWineList({ wines: initialWines, userId, userName }: PreviewWineListProps) {
  const [wines, setWines] = useState<DisplayWineRow[]>(() =>
    initialWines.map(withComputedValueScore),
  )
  const [filters, setFilters] = useState<WineFilters>(EMPTY_WINE_FILTERS)
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'winery', dir: 'asc' })
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: 'none', dir: 'asc' })

  const filterOptions = useMemo(() => collectFilterOptions(wines), [wines])
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  const filtered = useMemo(() => filterWines(wines, filters), [wines, filters])
  const searchIndex = useMemo(() => createWineSearchIndex(filtered), [filtered])

  const searched = useMemo(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return filtered
    const normalizedQuery = normalizeSearchText(trimmed)
    if (!normalizedQuery) return filtered
    return searchIndex.search(normalizedQuery).map((result) => result.item.wine)
  }, [filtered, searchIndex, searchQuery])

  const sorted = useMemo(
    () => sortWines(searched, primarySort, secondarySort),
    [searched, primarySort, secondarySort],
  )

  const previewWines = useMemo(() => sorted.map(toPreviewWineCard), [sorted])
  const colourCounts = useMemo(() => countWinesByColour(previewWines), [previewWines])

  const ratingThenPriceActive =
    primarySort.key === 'vivino_rating' &&
    primarySort.dir === 'desc' &&
    secondarySort.key === 'store_prices' &&
    secondarySort.dir === 'asc'

  return (
    <div className="min-h-screen" style={{ background: '#14141A' }}>
      <header
        className="sticky top-0 z-50"
        style={{
          background: '#0E0E12',
          borderBottom: '1px solid #2A2A34',
          boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#8F1A2B' }}
            >
              <Wine className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1
                className="text-sm font-semibold leading-none truncate"
                style={{ color: '#EDE8E0', fontFamily: 'var(--font-playfair), serif' }}
              >
                Wine Collection
              </h1>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: '#545060' }}>
                Preview design · {userName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="hidden sm:flex items-center gap-4 text-[11px]"
              style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              <span style={{ color: '#C93048' }}>{colourCounts.Red} Red</span>
              <span style={{ color: '#C4A040' }}>{colourCounts.White} White</span>
              <span style={{ color: '#C07060' }}>{colourCounts.Rosé} Rosé</span>
              <span style={{ color: '#4A88B0' }}>{colourCounts.Sparkling} Sparkling</span>
            </div>
            <Link
              href="/"
              className="text-xs px-3 py-1.5 rounded-lg no-underline"
              style={{
                background: '#1E1E26',
                border: '1px solid #3A3848',
                color: '#8A8898',
                fontFamily: 'var(--font-dm-sans), sans-serif',
              }}
            >
              Classic view
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-4">
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
          totalCount={wines.length}
        />
      </div>

      <main className="max-w-5xl mx-auto px-6 py-5 space-y-2.5">
        {previewWines.length === 0 ? (
          <p className="text-center text-sm py-12" style={{ color: '#6A6878' }}>
            No wines match your search or filters.
          </p>
        ) : (
          previewWines.map((wine) => {
            const source = wines.find((row) => String(row.id) === wine.id)
            return (
              <PreviewWineCard
                key={wine.id}
                wine={wine}
                userId={userId}
                review={source?.review}
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
