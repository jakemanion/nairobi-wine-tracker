'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'

type EditableTextCellProps = {
  label: string
  value: string | number | null | undefined
  display?: string
  align?: 'left' | 'center'
  multiline?: boolean
  onSave: (value: string | null) => Promise<{ error?: string }>
}

const displayButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  minHeight: 20,
}

const inputStyle: CSSProperties = {
  width: '100%',
  font: 'inherit',
  fontSize: 'inherit',
  border: '1px solid #99a',
  borderRadius: 3,
  padding: '2px 4px',
  boxSizing: 'border-box',
  background: '#fff',
}

function normalizeValue(value: string | number | null | undefined): string {
  if (value == null) return ''
  return String(value).trim()
}

export function EditableTextCell({
  label,
  value,
  display,
  align = 'left',
  multiline = false,
  onSave,
}: EditableTextCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const normalized = normalizeValue(value)
  const shown = display ?? (normalized || '-')

  useEffect(() => {
    if (editing) {
      setDraft(normalized)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, normalized])

  function cancel() {
    setEditing(false)
    setError(null)
  }

  async function submit() {
    if (saving) return

    const parsed = draft.trim() || null
    const current = normalized || null

    if (parsed === current) {
      cancel()
      return
    }

    setSaving(true)
    setError(null)

    const result = await onSave(parsed)

    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setEditing(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault()
      void submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  if (editing) {
    const sharedProps = {
      ref: inputRef as never,
      value: draft,
      disabled: saving,
      'aria-label': label,
      style: { ...inputStyle, textAlign: align },
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onKeyDown,
      onBlur: () => void submit(),
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {multiline ? (
          <textarea {...sharedProps} rows={2} />
        ) : (
          <input type="text" {...sharedProps} />
        )}
        {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <button
        type="button"
        style={{
          ...displayButtonStyle,
          textAlign: align,
          opacity: saving ? 0.5 : 1,
          wordBreak: 'break-word',
        }}
        disabled={saving}
        aria-label={`Edit ${label}`}
        onClick={(event) => {
          event.stopPropagation()
          setEditing(true)
        }}
      >
        {shown}
      </button>
      {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
    </div>
  )
}
