'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { EditableReviewNotesCell, EditableReviewRatingCell } from '@/components/review-edit-cell'
import { EditableReviewTriedStatusCell } from '@/components/review-tried-status-cell'
import { EditableReviewWishlistCell } from '@/components/review-wishlist-cell'
import {
  firstListingImageUrl,
  ListingThumbnail,
} from '@/components/listing-thumbnail'
import {
  WineFilterPanel,
  type SortCriterion,
  type SortDir,
  type SortFieldKey,
} from '@/components/wine-filter-panel'
import { minWinePriceKES, withComputedValueScore } from '@/lib/calculate-value-score'
import { formatWineLabel } from '@/lib/wines'
import {
  collectFilterOptions,
  countActiveFilters,
  EMPTY_WINE_FILTERS,
  filterWines,
  type WineFilters,
} from '@/lib/wine-filters'
import { createWineSearchIndex, hasActiveWineSearch, searchWinesFromIndex } from '@/lib/wine-search'
import { ClearShortlistButton } from '@/components/clear-shortlist-button'
export type WineReview = {
  id: string
  overall_score: number | null
  value_score: number | null
  wishlist: number | null
  tried_status: number | null
  shortlist: number | null
  hide: boolean | null
  want_to_try?: boolean | null
  tried?: boolean | null
  would_buy_again?: boolean | null
  tasting_notes: string | null
  tasted_on: string | null
}

export type WineRow = {
  id: string | number
  producer: string | null
  wine_name: string | null
  vintage: string | number | null
  country: string | null
  region: string | null
  grape_varieties: unknown
  style: string | null
  vivino_url: string | null
  vivino_rating: string | number | null
  valueScore?: number | null
  review?: WineReview | null
  store_listings?: Array<{
    id: string | number
    current_price_ksh: string | number | null
    store_product_url: string | null
    in_stock: boolean | null
    image_url?: string | null
    stores?: { id?: string | number; name?: string | null } | null
  }> | null
}

type DisplayWineRow = WineRow & { valueScore: number | null }

function defaultSortDir(key: SortFieldKey): SortDir {
  switch (key) {
    case 'value_score':
    case 'vivino_rating':
    case 'my_rating':
    case 'wishlist':
    case 'tried_status':
      return 'desc'
    default:
      return 'asc'
  }
}

function triedStatusSortNum(value: number | null | undefined): number | null {
  if (value == null) return null
  if (value === 0 || value === 1 || value === 2) return value
  return null
}

function wishlistSortNum(value: number | null | undefined): number | null {
  if (value == null) return null
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return null
}

function boolSortNum(value: boolean | null | undefined): number | null {
  if (value === true) return 1
  if (value === false) return 0
  return null
}

function formatGrapeVarieties(value: unknown): string {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function vintageNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseInt(String(v), 10)
  return Number.isFinite(n) ? n : null
}

function ratingNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function minListingPrice(wine: Pick<WineRow, 'store_listings'>): number | null {
  return minWinePriceKES(wine.store_listings)
}

function formatValueScore(value: number | null | undefined): string {
  return value != null ? value.toFixed(3) : '-'
}

function formatListingPrice(value: string | number | null | undefined): string {
  if (value == null || value === '') return '-'
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString('en-KE', { maximumFractionDigits: 0 })
}

function formatCountryRegion(country: string | null, region: string | null): string {
  const c = str(country)
  const r = str(region)
  if (c && r) return `${c} - ${r}`
  if (c) return c
  if (r) return r
  return '-'
}

const producerColumnStyle: CSSProperties = {
  width: '8%',
  maxWidth: 120,
  whiteSpace: 'normal',
  wordBreak: 'break-word',
}

const wineNameColumnStyle: CSSProperties = {
  width: '16%',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
}

const countryRegionColumnStyle: CSSProperties = {
  whiteSpace: 'normal',
  wordBreak: 'break-word',
}

const thumbColumnWidth = 72

function compareEmptyLast(
  aEmpty: boolean,
  bEmpty: boolean,
  body: () => number,
): number {
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  return body()
}

function compareWineField(a: DisplayWineRow, b: DisplayWineRow, key: SortFieldKey): number {
  switch (key) {
    case 'winery': {
      const as = str(a.producer).toLowerCase()
      const bs = str(b.producer).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'wine_name': {
      const as = str(a.wine_name).toLowerCase()
      const bs = str(b.wine_name).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'vintage': {
      const an = vintageNum(a.vintage)
      const bn = vintageNum(b.vintage)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'country': {
      const as = str(a.country).toLowerCase()
      const bs = str(b.country).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'region': {
      const as = str(a.region).toLowerCase()
      const bs = str(b.region).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'grapes': {
      const as = formatGrapeVarieties(a.grape_varieties).toLowerCase()
      const bs = formatGrapeVarieties(b.grape_varieties).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'style': {
      const as = str(a.style).toLowerCase()
      const bs = str(b.style).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    case 'vivino_rating': {
      const an = ratingNum(a.vivino_rating)
      const bn = ratingNum(b.vivino_rating)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'value_score': {
      const an = a.valueScore
      const bn = b.valueScore
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'my_rating': {
      const an = ratingNum(a.review?.overall_score)
      const bn = ratingNum(b.review?.overall_score)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'store_prices': {
      const an = minListingPrice(a)
      const bn = minListingPrice(b)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'wishlist': {
      const an = wishlistSortNum(a.review?.wishlist)
      const bn = wishlistSortNum(b.review?.wishlist)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'tried_status': {
      const an = triedStatusSortNum(a.review?.tried_status)
      const bn = triedStatusSortNum(b.review?.tried_status)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'notes': {
      const as = str(a.review?.tasting_notes).toLowerCase()
      const bs = str(b.review?.tasting_notes).toLowerCase()
      return compareEmptyLast(!as, !bs, () => as.localeCompare(bs, undefined, { sensitivity: 'base' }))
    }
    default:
      return 0
  }
}

function isSortFieldEmpty(wine: DisplayWineRow, key: SortFieldKey): boolean {
  switch (key) {
    case 'winery':
      return !str(wine.producer)
    case 'wine_name':
      return !str(wine.wine_name)
    case 'vintage':
      return vintageNum(wine.vintage) == null
    case 'country':
      return !str(wine.country)
    case 'region':
      return !str(wine.region)
    case 'grapes':
      return !formatGrapeVarieties(wine.grape_varieties)
    case 'style':
      return !str(wine.style)
    case 'vivino_rating':
      return ratingNum(wine.vivino_rating) == null
    case 'value_score':
      return wine.valueScore == null
    case 'store_prices':
      return minListingPrice(wine) == null
    case 'my_rating':
      return ratingNum(wine.review?.overall_score) == null
    case 'wishlist':
      return wishlistSortNum(wine.review?.wishlist) == null
    case 'tried_status':
      return triedStatusSortNum(wine.review?.tried_status) == null
    case 'notes':
      return !str(wine.review?.tasting_notes)
    default:
      return false
  }
}

function compareByCriterion(
  a: DisplayWineRow,
  b: DisplayWineRow,
  key: SortFieldKey,
  dir: SortDir,
): number {
  if (key === 'value_score') {
    const an = a.valueScore
    const bn = b.valueScore
    if (an == null && bn == null) return 0
    if (an == null) return 1
    if (bn == null) return -1
    return dir === 'desc' ? bn - an : an - bn
  }

  const ascending = compareWineField(a, b, key)
  if (ascending === 0) return 0
  if (isSortFieldEmpty(a, key) || isSortFieldEmpty(b, key)) return ascending

  return dir === 'asc' ? ascending : -ascending
}

export function sortWines(rows: DisplayWineRow[], primary: SortCriterion, secondary: SortCriterion): DisplayWineRow[] {
  return [...rows].sort((a, b) => {
    if (primary.key !== 'none') {
      const primaryCmp = compareByCriterion(a, b, primary.key, primary.dir)
      if (primaryCmp !== 0) return primaryCmp
    }

    if (secondary.key !== 'none' && secondary.key !== primary.key) {
      return compareByCriterion(a, b, secondary.key, secondary.dir)
    }

    return 0
  })
}

const thButton: CSSProperties = {
  background: 'none',
  border: 'none',
  font: 'inherit',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'inherit',
}

const thButtonCentered: CSSProperties = {
  ...thButton,
  textAlign: 'center',
  justifyContent: 'center',
}

const tableLinkStyle = (active = true): CSSProperties => ({
  textDecoration: 'none',
  color: active ? '#0a7' : '#999',
})

const userColumnStyle: CSSProperties = {
  backgroundColor: '#eef2f8',
  borderLeft: '2px solid #fff',
  textAlign: 'center',
}

const tableScrollStyle: CSSProperties = {
  overflow: 'auto',
  maxHeight: 'calc(100vh - 160px)',
  marginTop: 8,
}

const searchInputStyle: CSSProperties = {
  fontSize: 14,
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #ccc',
  background: '#fff',
  minWidth: 220,
  flex: '1 1 240px',
  maxWidth: 420,
  boxSizing: 'border-box',
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 14,
  tableLayout: 'fixed',
}

type HeaderProps = {
  label: string
  sortKey: SortFieldKey
  primarySort: SortCriterion
  secondarySort: SortCriterion
  onSort: (key: SortFieldKey) => void
  userColumn?: boolean
  centered?: boolean
  className?: string
}

function sortIndicator(
  sortKey: SortFieldKey,
  primarySort: SortCriterion,
  secondarySort: SortCriterion,
): string {
  if (primarySort.key === sortKey) {
    return primarySort.dir === 'asc' ? '↑' : '↓'
  }
  if (secondarySort.key === sortKey) {
    return secondarySort.dir === 'asc' ? '↑₂' : '↓₂'
  }
  return ''
}

function SortableTh({
  label,
  sortKey,
  primarySort,
  secondarySort,
  onSort,
  userColumn,
  centered,
  className,
}: HeaderProps) {
  const isPrimary = primarySort.key === sortKey
  const isSecondary = secondarySort.key === sortKey
  const ariaSort = isPrimary
    ? primarySort.dir === 'asc'
      ? 'ascending'
      : 'descending'
    : isSecondary
      ? secondarySort.dir === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none'
  const indicator = sortIndicator(sortKey, primarySort, secondarySort)
  const alignCenter = centered || userColumn

  return (
    <th
      className={[className, userColumn ? 'wine-table-user-th' : undefined].filter(Boolean).join(' ') || undefined}
      aria-sort={ariaSort}
      style={{
        textAlign: alignCenter ? 'center' : 'left',
        borderBottom: '2px solid #ccc',
        ...(userColumn ? userColumnStyle : {}),
      }}
    >
      <button
        type="button"
        style={alignCenter ? thButtonCentered : thButton}
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span style={{ display: 'inline-block', minWidth: 14, fontSize: 12 }} aria-hidden>
          {indicator}
        </span>
      </button>
    </th>
  )
}

function UserTd({ children }: { children: ReactNode }) {
  return <td className="wine-table-user-td" style={userColumnStyle}>{children}</td>
}

type CountryRegionThProps = {
  primarySort: SortCriterion
  secondarySort: SortCriterion
  onSort: (key: SortFieldKey) => void
}

function CountryRegionTh({ primarySort, secondarySort, onSort }: CountryRegionThProps) {
  const countryIndicator = sortIndicator('country', primarySort, secondarySort)
  const regionIndicator = sortIndicator('region', primarySort, secondarySort)
  const countryIsPrimary = primarySort.key === 'country'
  const regionIsPrimary = primarySort.key === 'region'

  return (
    <th
      aria-sort={
        countryIsPrimary
          ? primarySort.dir === 'asc'
            ? 'ascending'
            : 'descending'
          : regionIsPrimary
            ? primarySort.dir === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
      }
      style={{
        textAlign: 'left',
        borderBottom: '2px solid #ccc',
      }}
    >
      <button
        type="button"
        style={thButton}
        onClick={() => onSort('country')}
        aria-label="Sort by country"
      >
        <span>Country</span>
        <span style={{ display: 'inline-block', minWidth: 14, fontSize: 12 }} aria-hidden>
          {countryIndicator}
        </span>
      </button>
      <button
        type="button"
        style={thButton}
        onClick={() => onSort('region')}
        aria-label="Sort by region"
      >
        <span>Region</span>
        <span style={{ display: 'inline-block', minWidth: 14, fontSize: 12 }} aria-hidden>
          {regionIndicator}
        </span>
      </button>
    </th>
  )
}

type WineDataRowProps = {
  wine: DisplayWineRow
  showDetails: boolean
  userId: string
  onReviewChange: (review: WineReview | null) => void
}

function WineDataRow({ wine, showDetails, userId, onReviewChange }: WineDataRowProps) {
  const imageUrl = firstListingImageUrl(wine.store_listings ?? [])
  const imageAlt = formatWineLabel(wine)

  return (
    <tr>
      <td style={{ width: thumbColumnWidth, padding: '4px 6px' }}>
        <ListingThumbnail imageUrl={imageUrl} alt={imageAlt} size="large" />
      </td>
      <td className="wine-table-producer-col" style={producerColumnStyle}>
        {wine.producer ?? '-'}
      </td>
      <td className="wine-table-wine-name-col" style={wineNameColumnStyle}>
        {wine.wine_name ?? '-'}
      </td>

      {showDetails && (
        <>
          <td style={countryRegionColumnStyle}>
            {formatCountryRegion(wine.country, wine.region)}
          </td>
          <td>{formatGrapeVarieties(wine.grape_varieties) || '-'}</td>
          <td>{wine.style ?? '-'}</td>
        </>
      )}
      <td style={{ textAlign: 'center' }}>
        {wine.vivino_url && wine.vivino_rating != null && wine.vivino_rating !== '' ? (
          <a
            href={wine.vivino_url}
            target="_blank"
            rel="noreferrer"
            style={tableLinkStyle()}
          >
            {wine.vivino_rating}
          </a>
        ) : (
          (wine.vivino_rating ?? '-')
        )}
      </td>

      <td style={{ textAlign: 'center' }}>{formatValueScore(wine.valueScore)}</td>

      <td>
        {wine.store_listings?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {wine.store_listings.map((listing) => (
              <a
                key={listing.id}
                href={listing.store_product_url || '#'}
                target="_blank"
                rel="noreferrer"
                style={tableLinkStyle()}
              >
                {listing.stores?.name}: {formatListingPrice(listing.current_price_ksh)}
              </a>
            ))}
          </div>
        ) : (
          <span style={{ color: '#999' }}>No listings</span>
        )}
      </td>

      <UserTd>
        <EditableReviewWishlistCell
          label="Bookmark"
          wineId={String(wine.id)}
          userId={userId}
          review={wine.review}
          onReviewChange={onReviewChange}
        />
      </UserTd>
      <UserTd>
        <EditableReviewTriedStatusCell
          label="Tried"
          wineId={String(wine.id)}
          userId={userId}
          review={wine.review}
          onReviewChange={onReviewChange}
        />
      </UserTd>
      <UserTd>
        <EditableReviewRatingCell
          label="My rating"
          wineId={String(wine.id)}
          userId={userId}
          review={wine.review}
          onReviewChange={onReviewChange}
        />
      </UserTd>
      <UserTd>
        <EditableReviewNotesCell
          label="Notes"
          wineId={String(wine.id)}
          userId={userId}
          review={wine.review}
          onReviewChange={onReviewChange}
        />
      </UserTd>
    </tr>
  )
}

function clearShortlistFromWines(wines: DisplayWineRow[]): DisplayWineRow[] {
  return wines.map((wine) => {
    if (!wine.review || wine.review.shortlist !== 1) return wine
    return { ...wine, review: { ...wine.review, shortlist: null } }
  })
}

function updateWineReview(
  wines: DisplayWineRow[],
  wineId: string | number,
  review: WineReview | null,
): DisplayWineRow[] {
  return wines.map((wine) =>
    wine.id === wineId ? { ...wine, review: review ?? undefined } : wine,
  )
}

export function WineTable({ wines: initialWines, userId }: { wines: WineRow[]; userId: string }) {
  const initialWinesWithScores = useMemo(
    () => initialWines.map(withComputedValueScore),
    [initialWines],
  )
  const [wines, setWines] = useState<DisplayWineRow[]>(initialWinesWithScores)

  useEffect(() => {
    setWines(initialWines.map(withComputedValueScore))
  }, [initialWines])

  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'value_score', dir: 'desc' })
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: 'none', dir: 'asc' })
  const [showDetails, setShowDetails] = useState(true)
  const [filters, setFilters] = useState<WineFilters>(EMPTY_WINE_FILTERS)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filterOptions = useMemo(() => collectFilterOptions(wines), [wines])
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  const filtered = useMemo(() => filterWines(wines, filters), [wines, filters])
  const searchIndex = useMemo(() => createWineSearchIndex(filtered), [filtered])

  const searched = useMemo(() => {
    if (!hasActiveWineSearch(searchQuery)) return filtered
    return searchWinesFromIndex(searchIndex, searchQuery)
  }, [filtered, searchIndex, searchQuery])

  const onColumnSort = (key: SortFieldKey) => {
    if (primarySort.key === key) {
      setPrimarySort((current) => ({
        ...current,
        dir: current.dir === 'asc' ? 'desc' : 'asc',
      }))
      return
    }
    setPrimarySort({ key, dir: defaultSortDir(key) })
  }

  const sorted = useMemo(() => {
    if (hasActiveWineSearch(searchQuery)) return searched
    return sortWines(searched, primarySort, secondarySort)
  }, [searched, primarySort, secondarySort, searchQuery])

  const searchActive = searchQuery.trim().length > 0
  const listConstrained = sorted.length !== wines.length

  const ratingThenPriceActive =
    primarySort.key === 'vivino_rating' &&
    primarySort.dir === 'desc' &&
    secondarySort.key === 'store_prices' &&
    secondarySort.dir === 'asc'

  return (
    <>
      <style>{`
        .wine-table thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #fff;
          box-shadow: 0 2px 0 #ccc;
        }
        .wine-table thead th.wine-table-user-th {
          background: #eef2f8;
        }
        .wine-table tbody tr:hover td {
          background: #f3f8ff;
        }
        .wine-table tbody tr:hover td.wine-table-user-td {
          background: #e4ecf7;
        }
        .wine-table tbody td {
          border-bottom: 1px solid #ccc;
          vertical-align: middle;
        }
        .wine-table thead th {
          vertical-align: middle;
        }
        .wine-table thead th.wine-table-producer-col {
          width: 8%;
          max-width: 120px;
        }
        .wine-table thead th.wine-table-wine-name-col,
        .wine-table tbody td.wine-table-wine-name-col {
          width: 16%;
        }
      `}</style>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="search"
            value={searchQuery}
            placeholder="Search producer or wine name…"
            aria-label="Search producer or wine name"
            style={searchInputStyle}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchActive ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Clear search
            </button>
          ) : null}
          <ClearShortlistButton
            userId={userId}
            onCleared={() => setWines((current) => clearShortlistFromWines(current))}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <p style={{ margin: 0, color: '#555', fontSize: 14 }}>
            Showing <strong>{sorted.length}</strong>{' '}
            {sorted.length === 1 ? 'wine' : 'wines'}
            {listConstrained ? (
              <>
                {' '}
                of <strong>{wines.length}</strong>
              </>
            ) : null}
            {searchActive ? (
              <>
                {' '}
                matching &ldquo;{searchQuery.trim()}&rdquo;
              </>
            ) : null}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowDetails((visible) => !visible)}
              aria-pressed={showDetails}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              show/hide details
            </button>
          </div>
        </div>
        <WineFilterPanel
          expanded={panelExpanded}
          onExpandedChange={setPanelExpanded}
          filters={filters}
          onFiltersChange={setFilters}
          filterOptions={filterOptions}
          activeFilterCount={activeFilterCount}
          primarySort={primarySort}
          secondarySort={secondarySort}
          onPrimarySortChange={setPrimarySort}
          onSecondarySortChange={setSecondarySort}
          ratingThenPriceActive={ratingThenPriceActive}
          onApplyRatingThenPrice={() => {
            setPrimarySort({ key: 'vivino_rating', dir: 'desc' })
            setSecondarySort({ key: 'store_prices', dir: 'asc' })
          }}
          userId={userId}
          onShortlistCleared={() => setWines((current) => clearShortlistFromWines(current))}
        />
      </div>
      <div style={tableScrollStyle}>
        <table className="wine-table" style={tableStyle}>
      <thead>
        <tr>
          <th
            aria-label="Image"
            style={{ width: thumbColumnWidth, borderBottom: '2px solid #ccc' }}
          />
          <SortableTh
            label="Producer"
            sortKey="winery"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            className="wine-table-producer-col"
          />
          <SortableTh
            label="Wine name"
            sortKey="wine_name"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            className="wine-table-wine-name-col"
          />
          {showDetails && (
            <>
              <CountryRegionTh
                primarySort={primarySort}
                secondarySort={secondarySort}
                onSort={onColumnSort}
              />
              <SortableTh
                label="Grapes"
                sortKey="grapes"
                primarySort={primarySort}
                secondarySort={secondarySort}
                onSort={onColumnSort}
              />
              <SortableTh
                label="Style"
                sortKey="style"
                primarySort={primarySort}
                secondarySort={secondarySort}
                onSort={onColumnSort}
              />
            </>
          )}
          <SortableTh
            label="Vivino rating"
            sortKey="vivino_rating"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            centered
          />
          <SortableTh
            label="Value Score"
            sortKey="value_score"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            centered
          />
          <SortableTh
            label="Store Prices"
            sortKey="store_prices"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
          />
          <SortableTh
            label="Bookmark"
            sortKey="wishlist"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            userColumn
          />
          <SortableTh
            label="Tried"
            sortKey="tried_status"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            userColumn
          />
          <SortableTh
            label="My rating"
            sortKey="my_rating"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            userColumn
          />
          <SortableTh
            label="Notes"
            sortKey="notes"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            userColumn
          />
        </tr>
      </thead>

      <tbody>
        {sorted.map((wine) => (
          <WineDataRow
            key={wine.id}
            wine={wine}
            showDetails={showDetails}
            userId={userId}
            onReviewChange={(review) =>
              setWines((current) => updateWineReview(current, wine.id, review))
            }
          />
        ))}
      </tbody>
    </table>
      </div>
    </>
  )
}
