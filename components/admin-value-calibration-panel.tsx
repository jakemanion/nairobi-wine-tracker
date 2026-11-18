'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import {
  adminSaveValueScoreAnchors,
  type VivinoStarLookupEntry,
} from '@/app/admin/actions'
import { calculateValueScore } from '@/lib/calculate-value-score'
import { valueScoreToStarRating } from '@/lib/ratings/value-star-rating'
import {
  DEFAULT_VALUE_SCORE_ANCHORS,
  VALUE_MATRIX_PRICE_COLUMNS,
  anchorsToTables,
  applyValueAnchorDraftClick,
  draftToAnchor,
  maxPriceForFiveStarValue,
  priceForOneStarValue,
  qualityRowsForCalibration,
  vivinoLabelForQuality,
  type ValueCalibrateMode,
  type ValueScoreAnchor,
  type ValueScoreAnchorDraft,
} from '@/lib/ratings/value-anchors'

type AdminValueCalibrationPanelProps = {
  initialAnchors: ValueScoreAnchor[]
  savedLookupEntries: VivinoStarLookupEntry[]
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minHeight: 0,
  flex: 1,
}

const tableWrapStyle: CSSProperties = {
  overflow: 'auto',
  border: '1px solid #e2e2e8',
  borderRadius: 4,
  background: '#fff',
}

const tableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  fontSize: 12,
  minWidth: '100%',
}

const thStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  textAlign: 'center',
  padding: '6px 4px',
  borderBottom: '1px solid #ddd',
  background: '#f7f7f9',
  color: '#555',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const stickyColStyle: CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  background: '#fafafa',
  textAlign: 'left',
  padding: '4px 8px',
  borderBottom: '1px solid #eee',
  borderRight: '1px solid #eee',
  whiteSpace: 'nowrap',
}

const stickyColHeaderStyle: CSSProperties = {
  ...thStyle,
  ...stickyColStyle,
  zIndex: 3,
  textAlign: 'left',
}

const cellButtonStyle: CSSProperties = {
  width: '100%',
  minWidth: 36,
  margin: 0,
  padding: '4px 2px',
  border: '1px solid transparent',
  borderRadius: 3,
  background: 'transparent',
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  color: '#333',
}

function formatPriceHeader(price: number): string {
  if (price >= 1000) {
    const k = price / 1000
    return Number.isInteger(k) ? `${k}k` : `${k}k`
  }
  return String(price)
}

function nearestMatrixPrice(price: number): number {
  let best = VALUE_MATRIX_PRICE_COLUMNS[0]
  let bestDist = Math.abs(best - price)
  for (const candidate of VALUE_MATRIX_PRICE_COLUMNS) {
    const dist = Math.abs(candidate - price)
    if (dist < bestDist) {
      best = candidate
      bestDist = dist
    }
  }
  return best
}

function nextMatrixPriceAbove(price: number): number {
  for (const candidate of VALUE_MATRIX_PRICE_COLUMNS) {
    if (candidate > price) return candidate
  }
  return VALUE_MATRIX_PRICE_COLUMNS[VALUE_MATRIX_PRICE_COLUMNS.length - 1]
}

function anchorsToDraftMap(
  anchors: readonly ValueScoreAnchor[],
): Map<number, ValueScoreAnchorDraft> {
  const map = new Map<number, ValueScoreAnchorDraft>()
  for (const row of anchors) {
    map.set(row.quality_rating, {
      quality_rating: row.quality_rating,
      five_star_max_price: row.five_star_max_price,
      one_star_price: row.one_star_price,
    })
  }
  return map
}

/** Fill every quality row with saved or interpolated (matrix-snapped) anchors. */
function seedDraftsForQualities(
  qualities: number[],
  anchors: readonly ValueScoreAnchor[],
): Map<number, ValueScoreAnchorDraft> {
  const base = anchors.length > 0 ? anchors : [...DEFAULT_VALUE_SCORE_ANCHORS]
  const map = anchorsToDraftMap(base)
  const tables = anchorsToTables(base)

  for (const quality of qualities) {
    const existing = map.get(quality)
    if (existing && draftToAnchor(existing)) continue

    const five = nearestMatrixPrice(maxPriceForFiveStarValue(quality, tables))
    let one = nearestMatrixPrice(priceForOneStarValue(quality, tables))
    if (one <= five) one = nextMatrixPriceAbove(five)
    map.set(quality, {
      quality_rating: quality,
      five_star_max_price: five,
      one_star_price: one,
    })
  }

  return map
}

function draftsToCompleteAnchors(
  drafts: Map<number, ValueScoreAnchorDraft>,
  qualities: number[],
): { anchors: ValueScoreAnchor[]; error?: string } {
  const anchors: ValueScoreAnchor[] = []
  for (const quality of qualities) {
    const draft = drafts.get(quality)
    if (!draft) {
      return { anchors: [], error: `Missing calibration for quality ${quality}.` }
    }
    const anchor = draftToAnchor(draft)
    if (!anchor) {
      return {
        anchors: [],
        error: `Quality ${quality} needs both a 5★ max price and a 1★ price.`,
      }
    }
    anchors.push(anchor)
  }
  return { anchors }
}

export function AdminValueCalibrationPanel({
  initialAnchors,
  savedLookupEntries,
}: AdminValueCalibrationPanelProps) {
  const qualities = useMemo(
    () => qualityRowsForCalibration(savedLookupEntries),
    [savedLookupEntries],
  )

  const [drafts, setDrafts] = useState<Map<number, ValueScoreAnchorDraft>>(() =>
    seedDraftsForQualities(
      qualities,
      initialAnchors.length > 0 ? initialAnchors : [...DEFAULT_VALUE_SCORE_ANCHORS],
    ),
  )
  const [mode, setMode] = useState<ValueCalibrateMode>('five_star')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const completeAnchors = useMemo(() => {
    const rows: ValueScoreAnchor[] = []
    for (const draft of drafts.values()) {
      const anchor = draftToAnchor(draft)
      if (anchor) rows.push(anchor)
    }
    return rows.length > 0 ? rows : [...DEFAULT_VALUE_SCORE_ANCHORS]
  }, [drafts])

  function handleCellClick(quality: number, price: number) {
    setError(null)
    setMessage(null)
    const current = drafts.get(quality) ?? {
      quality_rating: quality,
      five_star_max_price: null,
      one_star_price: null,
    }
    const result = applyValueAnchorDraftClick({
      quality,
      price,
      mode,
      current,
    })
    if (result.error) {
      setError(result.error)
      return
    }
    setDrafts((prev) => {
      const next = new Map(prev)
      next.set(quality, result.draft!)
      return next
    })
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    setMessage(null)
    const prepared = draftsToCompleteAnchors(drafts, qualities)
    if (prepared.error) {
      setBusy(false)
      setError(prepared.error)
      return
    }
    const result = await adminSaveValueScoreAnchors(prepared.anchors)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage(`Saved ${result.saved} quality calibration rows.`)
  }

  function handleResetDefaults() {
    setDrafts(seedDraftsForQualities(qualities, DEFAULT_VALUE_SCORE_ANCHORS))
    setMessage(null)
    setError(null)
  }

  return (
    <div style={sectionStyle}>
      <p style={{ margin: 0, fontSize: 13, color: '#555', maxWidth: 720 }}>
        Click cells to set the <strong>5★ max price</strong> or <strong>1★ price</strong> for
        each quality. The matrix shows live value stars from the current draft. Vivino labels
        come from the <em>saved</em> lookup above.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#555' }}>Click mode:</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode('five_star')}
          style={{
            fontWeight: mode === 'five_star' ? 700 : 400,
            outline: mode === 'five_star' ? '2px solid #0a7' : undefined,
          }}
        >
          Set 5★ ceiling
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode('one_star')}
          style={{
            fontWeight: mode === 'one_star' ? 700 : 400,
            outline: mode === 'one_star' ? '2px solid #b45309' : undefined,
          }}
        >
          Set 1★ floor
        </button>
        <button type="button" disabled={busy} onClick={() => void handleSave()}>
          {busy ? 'Saving…' : 'Save value calibration'}
        </button>
        <button type="button" disabled={busy} onClick={handleResetDefaults}>
          Reset to defaults
        </button>
        {message ? <span style={{ color: '#0a7', fontSize: 13 }}>{message}</span> : null}
        {error ? <span style={{ color: '#c05050', fontSize: 13 }}>{error}</span> : null}
      </div>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...stickyColHeaderStyle, left: 0, minWidth: 56 }}>Quality</th>
              <th style={{ ...stickyColHeaderStyle, left: 56, minWidth: 72 }}>Vivino</th>
              {VALUE_MATRIX_PRICE_COLUMNS.map((price) => (
                <th key={price} style={thStyle}>
                  {formatPriceHeader(price)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qualities.map((quality) => {
              const draft = drafts.get(quality)
              const vivino = vivinoLabelForQuality(quality, savedLookupEntries)
              return (
                <tr key={quality}>
                  <td style={{ ...stickyColStyle, left: 0, minWidth: 56, fontWeight: 600 }}>
                    {quality}
                  </td>
                  <td style={{ ...stickyColStyle, left: 56, minWidth: 72, color: '#666' }}>
                    {vivino}
                  </td>
                  {VALUE_MATRIX_PRICE_COLUMNS.map((price) => {
                    const raw = calculateValueScore(quality, price, completeAnchors)
                    const stars = valueScoreToStarRating(raw)
                    const isFive = draft?.five_star_max_price === price
                    const isOne = draft?.one_star_price === price
                    let background = 'transparent'
                    let border = '1px solid transparent'
                    if (isFive && isOne) {
                      background = '#f3e8ff'
                      border = '1px solid #7c3aed'
                    } else if (isFive) {
                      background = '#e6f7ef'
                      border = '1px solid #0a7'
                    } else if (isOne) {
                      background = '#fff4e5'
                      border = '1px solid #b45309'
                    }
                    return (
                      <td
                        key={price}
                        style={{
                          padding: 2,
                          borderBottom: '1px solid #eee',
                          textAlign: 'center',
                        }}
                      >
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleCellClick(quality, price)}
                          title={
                            isFive
                              ? '5★ ceiling'
                              : isOne
                                ? '1★ floor'
                                : `Set ${mode === 'five_star' ? '5★' : '1★'} at ${price}`
                          }
                          style={{
                            ...cellButtonStyle,
                            background,
                            border,
                          }}
                        >
                          {stars == null ? '—' : stars}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
        Green = 5★ ceiling · Amber = 1★ floor. Saving updates site value scores on next load.
      </p>
    </div>
  )
}
