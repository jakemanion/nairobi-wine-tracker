'use client'

import { useState, type CSSProperties } from 'react'

type EditableBoolCellProps = {
  label: string
  value: boolean | null | undefined
  onSave: (value: boolean | null) => Promise<{ error?: string }>
}

const inactiveColor = '#bbb'
const tickActiveColor = '#0a7'
const crossActiveColor = '#c33'
const nullActiveColor = '#888'
const nullInactiveColor = '#ddd'

function NullIcon({ active }: { active: boolean }) {
  const color = active ? nullActiveColor : nullInactiveColor

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <rect x="1.5" y="1.5" width="11" height="11" fill="none" stroke={color} strokeWidth="1.5" />
      <line x1="2.5" y1="11.5" x2="11.5" y2="2.5" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

const optionButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '0 3px',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export function EditableBoolCell({ label, value, onSave }: EditableBoolCellProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = value ?? null

  async function setValue(next: boolean | null) {
    if (saving || current === next) return

    setSaving(true)
    setError(null)

    const result = await onSave(next)

    setSaving(false)

    if (result.error) {
      setError(result.error)
    }
  }

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        role="group"
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          opacity: saving ? 0.5 : 1,
        }}
      >
        <button
          type="button"
          style={{
            ...optionButtonStyle,
            color: current === true ? tickActiveColor : inactiveColor,
            fontWeight: current === true ? 700 : 400,
            cursor: saving ? 'wait' : 'pointer',
          }}
          disabled={saving}
          aria-label={`${label}: yes`}
          aria-pressed={current === true}
          onClick={() => setValue(true)}
        >
          ✓
        </button>
        <button
          type="button"
          style={{
            ...optionButtonStyle,
            color: current === false ? crossActiveColor : inactiveColor,
            fontWeight: current === false ? 700 : 400,
            cursor: saving ? 'wait' : 'pointer',
          }}
          disabled={saving}
          aria-label={`${label}: no`}
          aria-pressed={current === false}
          onClick={() => setValue(false)}
        >
          ✗
        </button>
        <button
          type="button"
          style={{
            ...optionButtonStyle,
            cursor: saving ? 'wait' : 'pointer',
          }}
          disabled={saving}
          aria-label={`${label}: not set`}
          aria-pressed={current == null}
          onClick={() => setValue(null)}
        >
          <NullIcon active={current == null} />
        </button>
      </div>
      {error && (
        <span style={{ color: '#c33', fontSize: 10, maxWidth: 90, lineHeight: 1.2 }}>
          {error}
        </span>
      )}
    </div>
  )
}
