'use client'

import { useMemo, useState, type CSSProperties } from 'react'

export type WineReview = {
  id: string
  overall_score: number | null
  value_score: number | null
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
  review?: WineReview | null
  store_listings?: Array<{
    id: string | number
    current_price_ksh: string | number | null
    store_product_url: string | null
    in_stock: boolean | null
    stores?: { id?: string | number; name?: string | null } | null
  }> | null
}

type SortKey =
  | 'winery'
  | 'wine_name'
  | 'vintage'
  | 'country'
  | 'region'
  | 'grapes'
  | 'style'
  | 'vivino_rating'
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

function minListingPrice(wine: WineRow): number | null {
  const listings = wine.store_listings
  if (!listings?.length) return null
  let min: number | null = null
  for (const listing of listings) {
    const p = listing?.current_price_ksh
    if (p == null) continue
    const n = typeof p === 'number' ? p : parseFloat(String(p))
    if (!Number.isFinite(n)) continue
    min = min == null ? n : Math.min(min, n)
  }
  return min
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

function compareWine(a: WineRow, b: WineRow, key: SortKey): number {
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

function sortWines(rows: WineRow[], key: SortKey, dir: SortDir): WineRow[] {
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

const tableLinkStyle = (active = true): CSSProperties => ({
  textDecoration: 'none',
  color: active ? '#0a7' : '#999',
})

type HeaderProps = {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
}

function SortableTh({ label, sortKey, activeKey, dir, onSort }: HeaderProps) {
  const isActive = activeKey === sortKey
  const ariaSort = isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
  const indicator = isActive ? (dir === 'asc' ? '↑' : '↓') : ''

  return (
    <th aria-sort={ariaSort} style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
      <button
        type="button"
        style={thButton}
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

export function WineTable({ wines }: { wines: WineRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('winery')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(
    () => sortWines(wines, sortKey, sortDir),
    [wines, sortKey, sortDir],
  )

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: 20,
        fontSize: 14,
      }}
    >
      <thead>
        <tr>
          <SortableTh label="Winery" sortKey="winery" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh label="Wine name" sortKey="wine_name" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh label="Vintage" sortKey="vintage" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh label="Country" sortKey="country" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh label="Region" sortKey="region" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh label="Grapes" sortKey="grapes" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh label="Style" sortKey="style" activeKey={sortKey} dir={sortDir} onSort={onSort} />
          <SortableTh
            label="Vivino rating"
            sortKey="vivino_rating"
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
          />
          <th style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>Would buy again</th>
          <th style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>Tasting notes</th>
          <SortableTh
            label="Store Prices"
            sortKey="store_prices"
            activeKey={sortKey}
            dir={sortDir}
            onSort={onSort}
          />
        </tr>
      </thead>

      <tbody>
        {sorted.map((wine) => (
          <tr key={wine.id} style={{ borderBottom: '1px solid #eee' }}>
            <td>{wine.producer ?? '-'}</td>
            <td>{wine.wine_name ?? '-'}</td>

            <td>{wine.vintage ?? '-'}</td>
            <td>{wine.country ?? '-'}</td>
            <td>{wine.region ?? '-'}</td>
            <td>{formatGrapeVarieties(wine.grape_varieties) || '-'}</td>
            <td>{wine.style ?? '-'}</td>
            <td>
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

            <td>{wine.review?.overall_score ?? '-'}</td>
            <td>
              {wine.review?.would_buy_again == null
                ? '-'
                : wine.review.would_buy_again
                  ? 'Yes'
                  : 'No'}
            </td>
            <td>{wine.review?.tasting_notes?.trim() || '-'}</td>

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
          </tr>
        ))}
      </tbody>
    </table>
  )
}
