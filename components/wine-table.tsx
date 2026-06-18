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

type SortKey =
  | 'winery'
  | 'wine_name'
  | 'vintage'
  | 'country'
  | 'region'
  | 'grapes'
  | 'style'
  | 'vivino_rating'
  | 'vivino_then_price'
  | 'value_score'
  | 'my_rating'
  | 'store_prices'

type SortDir = 'asc' | 'desc'

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

function compareWine(a: DisplayWineRow, b: DisplayWineRow, key: SortKey): number {
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
    default:
      return 0
  }
}

function compareVivinoThenPrice(a: DisplayWineRow, b: DisplayWineRow): number {
  const ar = ratingNum(a.vivino_rating)
  const br = ratingNum(b.vivino_rating)
  const aRatingEmpty = ar == null
  const bRatingEmpty = br == null

  if (!aRatingEmpty && !bRatingEmpty && ar !== br) {
    return br - ar
  }
  if (aRatingEmpty !== bRatingEmpty) {
    return aRatingEmpty ? 1 : -1
  }

  const ap = minListingPrice(a)
  const bp = minListingPrice(b)
  if (ap == null && bp == null) return 0
  if (ap == null) return 1
  if (bp == null) return -1
  return ap - bp
}

function sortWines(rows: DisplayWineRow[], key: SortKey, dir: SortDir): DisplayWineRow[] {
  if (key === 'vivino_then_price') {
    return [...rows].sort(compareVivinoThenPrice)
  }

  if (key === 'value_score') {
    return [...rows].sort((a, b) => {
      const an = a.valueScore
      const bn = b.valueScore
      if (an == null && bn == null) return 0
      if (an == null) return 1
      if (bn == null) return -1
      return dir === 'desc' ? bn - an : an - bn
    })
  }

  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => compareWine(a, b, key) * sign)
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
}

type HeaderProps = {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  userColumn?: boolean
  centered?: boolean
}

function SortableTh({ label, sortKey, activeKey, dir, onSort, userColumn, centered }: HeaderProps) {
  const isActive = activeKey === sortKey
  const ariaSort = isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
  const indicator = isActive ? (dir === 'asc' ? '↑' : '↓') : ''
  const alignCenter = centered || userColumn

  return (
    <th
      className={userColumn ? 'wine-table-user-th' : undefined}
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

function UserTh({ label }: { label: string }) {
  return (
    <th className="wine-table-user-th" style={{ borderBottom: '2px solid #ccc', ...userColumnStyle }}>
      {label}
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
        style={{ borderBottom: '1px solid #eee' }}
        onMouseMove={handleRowMouseMove}
        onMouseLeave={handleRowMouseLeave}
      >
        <td style={{ width: 36, padding: '4px 6px', verticalAlign: 'middle' }}>
          <ListingThumbnail
            imageUrl={imageUrl}
            alt={imageAlt}
            showHoverPreview={false}
            onLoadStateChange={handleLoadStateChange}
          />
        </td>
      <td>{wine.producer ?? '-'}</td>
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
                style={tableLinkStyle(listing.in_stock ?? false)}
              >
                {listing.stores?.name}: KES {listing.current_price_ksh ?? '-'}
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

  const [sortKey, setSortKey] = useState<SortKey>('winery')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showDetails, setShowDetails] = useState(true)

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'value_score' ? 'desc' : 'asc')
    }
  }

  const sorted = useMemo(
    () => sortWines(wines, sortKey, sortDir),
    [wines, sortKey, sortDir],
  )

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
      `}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 20,
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
            onClick={() => setSortKey('vivino_then_price')}
            aria-pressed={sortKey === 'vivino_then_price'}
            style={{
              padding: '6px 12px',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: sortKey === 'vivino_then_price' ? 600 : 400,
            }}
          >
            Sort: rating → price
          </button>
        </div>
      </div>
      <div style={tableScrollStyle}>
        <table className="wine-table" style={tableStyle}>
      <thead>
        <tr>
          <th
            aria-label="Image"
            style={{ width: 36, borderBottom: '2px solid #ccc' }}
          />
          <SortableTh label="Winery" sortKey="winery" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh label="Wine name" sortKey="wine_name" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          {showDetails && (
            <>
              <SortableTh label="Vintage" sortKey="vintage" activeKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortableTh label="Country" sortKey="country" activeKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortableTh label="Region" sortKey="region" activeKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortableTh label="Grapes" sortKey="grapes" activeKey={sortKey} dir={sortDir} onSort={onSort} />
              <SortableTh label="Style" sortKey="style" activeKey={sortKey} dir={sortDir} onSort={onSort} />
            </>
          )}
          <SortableTh
            label="Vivino rating"
            sortKey="vivino_rating"
            activeKey={sortKey}
            dir={sortDir}
            onSort={onSort}
            centered
          />
          <SortableTh
            label="Value Score"
            sortKey="value_score"
            activeKey={sortKey}
            dir={sortDir}
            onSort={onSort}
            centered
          />
          <SortableTh
            label="Store Prices"
            sortKey="store_prices"
            activeKey={sortKey}
            dir={sortDir}
            onSort={onSort}
          />
          <SortableTh
            label="My rating"
            sortKey="my_rating"
            activeKey={sortKey}
            dir={sortDir}
            onSort={onSort}
            userColumn
          />
          <UserTh label="Want to try" />
          <UserTh label="Tried" />
          <UserTh label="Buy again" />
          <UserTh label="Notes" />
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
