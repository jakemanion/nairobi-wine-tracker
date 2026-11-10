'use client'

import { useState, type CSSProperties } from 'react'
import {
  adminSaveVivinoStarLookup,
  type VivinoStarLookupEntry,
} from '@/app/admin/actions'
import { DEFAULT_VIVINO_STAR_LOOKUP } from '@/lib/ratings/quality-rating'

type AdminRatingsPanelProps = {
  initialEntries: VivinoStarLookupEntry[]
}

const tableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  maxWidth: 480,
  fontSize: 13,
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid #ddd',
  color: '#555',
  fontWeight: 600,
}

const tdStyle: CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #eee',
}

const inputStyle: CSSProperties = {
  width: 80,
  font: 'inherit',
  fontSize: 13,
  border: '1px solid #99a',
  borderRadius: 3,
  padding: '2px 6px',
}

function entriesFromDefaults(): VivinoStarLookupEntry[] {
  return Object.entries(DEFAULT_VIVINO_STAR_LOOKUP)
    .map(([vivino_key, star_rating]) => ({ vivino_key, star_rating }))
    .sort((a, b) => a.vivino_key.localeCompare(b.vivino_key))
}

export function AdminRatingsPanel({ initialEntries }: AdminRatingsPanelProps) {
  const [entries, setEntries] = useState<VivinoStarLookupEntry[]>(() =>
    initialEntries.length > 0
      ? [...initialEntries].sort((a, b) => a.vivino_key.localeCompare(b.vivino_key))
      : entriesFromDefaults(),
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function patchRow(index: number, patch: Partial<VivinoStarLookupEntry>) {
    setEntries((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function addRow() {
    setEntries((current) => [
      ...current,
      { vivino_key: suggestNextKey(current), star_rating: 0 },
    ])
  }

  function removeRow(index: number) {
    setEntries((current) => current.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    setMessage(null)
    const result = await adminSaveVivinoStarLookup(entries)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage(`Saved. Recomputed quality_rating on ${result.updatedWines} wines.`)
  }

  function handleResetDefaults() {
    setEntries(entriesFromDefaults())
    setMessage(null)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
      <p style={{ margin: 0, fontSize: 13, color: '#555', maxWidth: 560 }}>
        Map Vivino scores (one decimal) to site quality stars (0–5 in 0.25 steps). Saving
        updates the lookup table and recomputes every wine&apos;s calculated{' '}
        <code>quality_rating</code>. Per-wine overrides are left unchanged.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" disabled={busy} onClick={() => void handleSave()}>
          {busy ? 'Saving…' : 'Save & recompute'}
        </button>
        <button type="button" disabled={busy} onClick={addRow}>
          Add row
        </button>
        <button type="button" disabled={busy} onClick={handleResetDefaults}>
          Reset to defaults
        </button>
        {message ? <span style={{ color: '#0a7', fontSize: 13 }}>{message}</span> : null}
        {error ? <span style={{ color: '#c05050', fontSize: 13 }}>{error}</span> : null}
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Vivino</th>
            <th style={thStyle}>Stars</th>
            <th style={thStyle} />
          </tr>
        </thead>
        <tbody>
          {entries.map((row, index) => (
            <tr key={index}>
              <td style={tdStyle}>
                <input
                  style={inputStyle}
                  value={row.vivino_key}
                  disabled={busy}
                  onChange={(event) => patchRow(index, { vivino_key: event.target.value })}
                  aria-label={`Vivino key row ${index + 1}`}
                />
              </td>
              <td style={tdStyle}>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  max={5}
                  step={0.25}
                  value={row.star_rating}
                  disabled={busy}
                  onChange={(event) => {
                    const n = Number(event.target.value)
                    if (Number.isFinite(n)) patchRow(index, { star_rating: n })
                  }}
                  aria-label={`Star rating row ${index + 1}`}
                />
              </td>
              <td style={tdStyle}>
                <button
                  type="button"
                  disabled={busy || entries.length <= 1}
                  onClick={() => removeRow(index)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function suggestNextKey(entries: VivinoStarLookupEntry[]): string {
  const nums = entries
    .map((row) => parseFloat(row.vivino_key))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 2.9
  const next = Math.round((max + 0.1) * 10) / 10
  return next.toFixed(1)
}
