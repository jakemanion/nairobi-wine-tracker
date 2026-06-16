'use client'

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

type EditableTextCellProps = {
  label: string
  value: string | number | null | undefined
  display?: string
  align?: 'left' | 'center'
  multiline?: boolean
  inline?: boolean
  noTruncate?: boolean
  emptyDisplay?: string
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

function selectAllInField(element: HTMLInputElement | HTMLTextAreaElement) {
  element.focus({ preventScroll: true })
  element.select()
}

export function EditableTextCell({
  label,
  value,
  display,
  align = 'left',
  multiline = false,
  inline = false,
  noTruncate = false,
  emptyDisplay = '-',
  onSave,
}: EditableTextCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const selectAllOnFocusRef = useRef(true)

  const normalized = normalizeValue(value)
  const shown = display ?? (normalized || emptyDisplay)

  useLayoutEffect(() => {
    if (!editing) return

    const element = inputRef.current
    if (!element) return

    selectAllInField(element)
    selectAllOnFocusRef.current = true

    const timeoutId = window.setTimeout(() => {
      if (inputRef.current) selectAllInField(inputRef.current)
    }, 0)
    const rafId = window.requestAnimationFrame(() => {
      if (inputRef.current) selectAllInField(inputRef.current)
    })

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(rafId)
    }
  }, [editing])

  function beginEditing(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    event.preventDefault()
    setError(null)
    setDraft(normalized)
    selectAllOnFocusRef.current = true
    setEditing(true)
  }

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
    event.stopPropagation()

    if (event.key === 'Enter' && !multiline) {
      event.preventDefault()
      void submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  function onInputMouseDown(event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) {
    event.stopPropagation()
    if (selectAllOnFocusRef.current) {
      event.preventDefault()
      selectAllInField(event.currentTarget)
    }
  }

  function onInputFocus(event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (!selectAllOnFocusRef.current) return
    selectAllInField(event.currentTarget)
    selectAllOnFocusRef.current = false
  }

  function onInputClick(event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) {
    event.stopPropagation()
    if (selectAllOnFocusRef.current) {
      selectAllInField(event.currentTarget)
      selectAllOnFocusRef.current = false
    }
  }

  const wrapperStyle: CSSProperties = inline
    ? { display: 'inline-flex', alignItems: 'center', gap: 2, maxWidth: '100%' }
    : { display: 'flex', flexDirection: 'column', gap: 2 }

  const fieldStyle: CSSProperties = inline
    ? {
        ...inputStyle,
        textAlign: align,
        width: noTruncate ? '100%' : 'auto',
        minWidth: 48,
        maxWidth: noTruncate ? 'none' : 220,
      }
    : { ...inputStyle, textAlign: align }

  if (editing) {
    const sharedProps = {
      ref: inputRef as never,
      value: draft,
      disabled: saving,
      'aria-label': label,
      style: fieldStyle,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onKeyDown,
      onMouseDown: onInputMouseDown,
      onFocus: onInputFocus,
      onClick: onInputClick,
      onBlur: () => void submit(),
    }

    return (
      <span
        style={wrapperStyle}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {multiline ? (
          <textarea {...sharedProps} rows={1} autoFocus />
        ) : (
          <input type="text" {...sharedProps} autoFocus />
        )}
        {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
      </span>
    )
  }

  return (
    <span style={wrapperStyle}>
      <button
        type="button"
        style={{
          ...displayButtonStyle,
          textAlign: align,
          opacity: saving ? 0.5 : 1,
          wordBreak: inline && noTruncate ? 'break-word' : inline ? 'normal' : 'break-word',
          width: inline && !noTruncate ? 'auto' : '100%',
          minHeight: inline ? 0 : 20,
          whiteSpace: inline && !noTruncate ? 'nowrap' : 'normal',
          overflow: inline && !noTruncate ? 'hidden' : undefined,
          textOverflow: inline && !noTruncate ? 'ellipsis' : undefined,
          maxWidth: inline && !noTruncate ? 200 : undefined,
        }}
        disabled={saving}
        aria-label={`Edit ${label}`}
        title={inline && !noTruncate ? String(shown) : undefined}
        onMouseDown={beginEditing}
      >
        {shown}
      </button>
      {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
    </span>
  )
}
