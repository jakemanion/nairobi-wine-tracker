'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { EditableReviewBoolCell } from '@/components/review-bool-cell'
import { EditableReviewNotesCell, EditableReviewRatingCell } from '@/components/review-edit-cell'
import {
  CursorImagePreview,
  firstListingImageUrl,
  ListingThumbnail,
  placeImagePreviewNearCursor,
} from '@/components/listing-thumbnail'
import { minWinePriceKES, withComputedValueScore } from '@/lib/calculate-value-score'
import { formatWineLabel } from '@/lib/wines'
export type WineReview = {
  id: string
  overall_score: number | null
  value_score: number | null
  want_to_try: boolean | null
  tried: boolean | null
  would_buy_again: boolean | null
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

type SortFieldKey =
  | 'winery'
  | 'wine_name'
  | 'vintage'
  | 'country'
  | 'region'
  | 'grapes'
  | 'style'
  | 'vivino_rating'
  | 'value_score'
  | 'store_prices'
  | 'my_rating'
  | 'want_to_try'
  | 'tried'
  | 'would_buy_again'
  | 'notes'

type SortFieldOption = SortFieldKey | 'none'

type SortDir = 'asc' | 'desc'

type SortCriterion = {
  key: SortFieldOption
  dir: SortDir
}

const SORT_FIELD_OPTIONS: Array<{ value: SortFieldKey; label: string }> = [
  { value: 'winery', label: 'Producer' },
  { value: 'wine_name', label: 'Wine name' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'grapes', label: 'Grapes' },
  { value: 'style', label: 'Style' },
  { value: 'vivino_rating', label: 'Vivino rating' },
  { value: 'value_score', label: 'Value score' },
  { value: 'store_prices', label: 'Store price' },
  { value: 'my_rating', label: 'My rating' },
  { value: 'want_to_try', label: 'Want to try' },
  { value: 'tried', label: 'Tried' },
  { value: 'would_buy_again', label: 'Buy again' },
  { value: 'notes', label: 'Notes' },
]

const SORT_DIR_OPTIONS: Array<{ value: SortDir; label: string }> = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
]

function defaultSortDir(key: SortFieldKey): SortDir {
  switch (key) {
    case 'value_score':
    case 'vivino_rating':
    case 'my_rating':
    case 'want_to_try':
    case 'tried':
    case 'would_buy_again':
      return 'desc'
    default:
      return 'asc'
  }
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

const producerColumnStyle: CSSProperties = {
  width: '8%',
  maxWidth: 120,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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
    case 'want_to_try': {
      const an = boolSortNum(a.review?.want_to_try)
      const bn = boolSortNum(b.review?.want_to_try)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'tried': {
      const an = boolSortNum(a.review?.tried)
      const bn = boolSortNum(b.review?.tried)
      return compareEmptyLast(an == null, bn == null, () => (an as number) - (bn as number))
    }
    case 'would_buy_again': {
      const an = boolSortNum(a.review?.would_buy_again)
      const bn = boolSortNum(b.review?.would_buy_again)
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
    case 'want_to_try':
      return boolSortNum(wine.review?.want_to_try) == null
    case 'tried':
      return boolSortNum(wine.review?.tried) == null
    case 'would_buy_again':
      return boolSortNum(wine.review?.would_buy_again) == null
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

function sortWines(rows: DisplayWineRow[], primary: SortCriterion, secondary: SortCriterion): DisplayWineRow[] {
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

const controlSelectStyle: CSSProperties = {
  fontSize: 14,
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #ccc',
  background: '#fff',
}

function SortControls({
  primarySort,
  secondarySort,
  onPrimaryChange,
  onSecondaryChange,
}: {
  primarySort: SortCriterion
  secondarySort: SortCriterion
  onPrimaryChange: (next: SortCriterion) => void
  onSecondaryChange: (next: SortCriterion) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        fontSize: 14,
      }}
    >
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span>Sort by</span>
        <select
          aria-label="Primary sort field"
          value={primarySort.key}
          style={controlSelectStyle}
          onChange={(event) => {
            const key = event.target.value as SortFieldKey
            onPrimaryChange({ key, dir: defaultSortDir(key) })
          }}
        >
          {SORT_FIELD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Primary sort direction"
          value={primarySort.dir}
          style={controlSelectStyle}
          disabled={primarySort.key === 'none'}
          onChange={(event) =>
            onPrimaryChange({ ...primarySort, dir: event.target.value as SortDir })
          }
        >
          {SORT_DIR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span>then by</span>
        <select
          aria-label="Secondary sort field"
          value={secondarySort.key}
          style={controlSelectStyle}
          onChange={(event) => {
            const key = event.target.value as SortFieldOption
            if (key === 'none') {
              onSecondaryChange({ key: 'none', dir: 'asc' })
              return
            }
            onSecondaryChange({ key, dir: defaultSortDir(key) })
          }}
        >
          <option value="none">None</option>
          {SORT_FIELD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Secondary sort direction"
          value={secondarySort.dir}
          style={controlSelectStyle}
          disabled={secondarySort.key === 'none'}
          onChange={(event) =>
            onSecondaryChange({ ...secondarySort, dir: event.target.value as SortDir })
          }
        >
          {SORT_DIR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
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

type WineDataRowProps = {
  wine: DisplayWineRow
  showDetails: boolean
  userId: string
  onReviewChange: (review: WineReview | null) => void
}

function WineDataRow({ wine, showDetails, userId, onReviewChange }: WineDataRowProps) {
  const imageUrl = firstListingImageUrl(wine.store_listings ?? [])
  const imageAlt = formatWineLabel(wine)
  const [imageReady, setImageReady] = useState(false)
  const [preview, setPreview] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    setImageReady(false)
    setPreview(null)
  }, [imageUrl])

  const handleLoadStateChange = useCallback((state: { loaded: boolean; failed: boolean }) => {
    setImageReady(state.loaded && !state.failed)
  }, [])

  function handleRowMouseMove(event: MouseEvent<HTMLTableRowElement>) {
    if (!imageUrl || !imageReady) return
    setPreview(placeImagePreviewNearCursor(event.clientX, event.clientY))
  }

  function handleRowMouseLeave() {
    setPreview(null)
  }

  return (
    <>
      <tr
        onMouseMove={handleRowMouseMove}
        onMouseLeave={handleRowMouseLeave}
      >
        <td style={{ width: thumbColumnWidth, padding: '4px 6px', verticalAlign: 'middle' }}>
          <ListingThumbnail
            imageUrl={imageUrl}
            alt={imageAlt}
            size="large"
            showHoverPreview={false}
            onLoadStateChange={handleLoadStateChange}
          />
        </td>
      <td
        className="wine-table-producer-col"
        style={producerColumnStyle}
        title={wine.producer ?? undefined}
      >
        {wine.producer ?? '-'}
      </td>
      <td>{wine.wine_name ?? '-'}</td>

      {showDetails && (
        <>
          <td>{wine.vintage ?? '-'}</td>
          <td>{wine.country ?? '-'}</td>
          <td>{wine.region ?? '-'}</td>
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
        <EditableReviewRatingCell
          label="My rating"
          wineId={String(wine.id)}
          userId={userId}
          review={wine.review}
          onReviewChange={onReviewChange}
        />
      </UserTd>
      <UserTd>
        <EditableReviewBoolCell
          label="Want to try"
          field="want_to_try"
          wineId={String(wine.id)}
          userId={userId}
          review={wine.review}
          onReviewChange={onReviewChange}
        />
      </UserTd>
      <UserTd>
        <EditableReviewBoolCell
          label="Tried"
          field="tried"
          wineId={String(wine.id)}
          userId={userId}
          review={wine.review}
          onReviewChange={onReviewChange}
        />
      </UserTd>
      <UserTd>
        <EditableReviewBoolCell
          label="Buy again"
          field="would_buy_again"
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

      {imageUrl && imageReady && preview ? (
        <CursorImagePreview src={imageUrl} alt={imageAlt} position={preview} />
      ) : null}
    </>
  )
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

  const [primarySort, setPrimarySort] = useState<SortCriterion>({ key: 'winery', dir: 'asc' })
  const [secondarySort, setSecondarySort] = useState<SortCriterion>({ key: 'none', dir: 'asc' })
  const [showDetails, setShowDetails] = useState(true)

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

  const sorted = useMemo(
    () => sortWines(wines, primarySort, secondarySort),
    [wines, primarySort, secondarySort],
  )

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
        }
        .wine-table thead th.wine-table-producer-col {
          width: 8%;
          max-width: 120px;
        }
      `}</style>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            Showing <strong>{sorted.length}</strong> {sorted.length === 1 ? 'wine' : 'wines'}
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
            <button
              type="button"
              onClick={() => {
                setPrimarySort({ key: 'vivino_rating', dir: 'desc' })
                setSecondarySort({ key: 'store_prices', dir: 'asc' })
              }}
              aria-pressed={ratingThenPriceActive}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: ratingThenPriceActive ? 600 : 400,
              }}
            >
              Sort: rating → price
            </button>
          </div>
        </div>
        <SortControls
          primarySort={primarySort}
          secondarySort={secondarySort}
          onPrimaryChange={setPrimarySort}
          onSecondaryChange={setSecondarySort}
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
          />
          {showDetails && (
            <>
              <SortableTh
                label="Vintage"
                sortKey="vintage"
                primarySort={primarySort}
                secondarySort={secondarySort}
                onSort={onColumnSort}
              />
              <SortableTh
                label="Country"
                sortKey="country"
                primarySort={primarySort}
                secondarySort={secondarySort}
                onSort={onColumnSort}
              />
              <SortableTh
                label="Region"
                sortKey="region"
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
            label="My rating"
            sortKey="my_rating"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            userColumn
          />
          <SortableTh
            label="Want to try"
            sortKey="want_to_try"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            userColumn
          />
          <SortableTh
            label="Tried"
            sortKey="tried"
            primarySort={primarySort}
            secondarySort={secondarySort}
            onSort={onColumnSort}
            userColumn
          />
          <SortableTh
            label="Buy again"
            sortKey="would_buy_again"
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
