'use client'

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import type { WineReview } from '@/components/wine-table'
import { saveReviewField } from '@/lib/reviews'

type ReviewEditCellProps = {
  label: string
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

const displayButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  textAlign: 'center',
  width: '100%',
  minHeight: 20,
}

const inputStyle: CSSProperties = {
  width: '100%',
  font: 'inherit',
  fontSize: 'inherit',
  textAlign: 'center',
  border: '1px solid #99a',
  borderRadius: 3,
  padding: '2px 4px',
  boxSizing: 'border-box',
  background: '#fff',
}

function buildOptimisticReview(
  review: WineReview | null | undefined,
  patch: Partial<WineReview>,
): WineReview {
  return {
    id: review?.id ?? 'pending',
    overall_score: review?.overall_score ?? null,
    value_score: review?.value_score ?? null,
    wishlist: review?.wishlist ?? null,
    tried_status: review?.tried_status ?? null,
    shortlist: review?.shortlist ?? null,
    hide: review?.hide ?? null,
    want_to_try: review?.want_to_try ?? null,
    tasting_notes: review?.tasting_notes ?? null,
    tasted_on: review?.tasted_on ?? null,
    ...patch,
  }
}

function parseRating(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '-') return null
  const n = parseFloat(trimmed)
  if (!Number.isFinite(n)) throw new Error('Enter a valid rating')
  const rounded = Math.round(n * 10) / 10
  if (rounded < 0 || rounded > 5) throw new Error('Rating must be between 0 and 5')
  return rounded
}

function formatRating(value: number | null | undefined): string {
  if (value == null) return '-'
  return value.toFixed(1)
}

type RatingParts = { int: number; dec: number }

function ratingToParts(value: number | null | undefined): RatingParts | null {
  if (value == null) return null
  const rounded = Math.round(value * 10) / 10
  const int = Math.floor(rounded)
  let dec = Math.round((rounded - int) * 10)
  if (int === 5) dec = 0
  return { int, dec }
}

function partsToRating(parts: RatingParts): number {
  return Math.round((parts.int + parts.dec / 10) * 10) / 10
}

function parseRatingParts(intStr: string, decStr: string): number | null {
  const i = intStr.trim()
  const d = decStr.trim()
  if (!i && !d) return null
  if (!i) throw new Error('Enter a rating')
  const int = parseInt(i, 10)
  const dec = d ? parseInt(d, 10) : 0
  if (!Number.isFinite(int) || !Number.isFinite(dec)) throw new Error('Enter a valid rating')
  if (int < 0 || int > 5 || dec < 0 || dec > 9) throw new Error('Rating must be between 0 and 5')
  if (int === 5 && dec > 0) throw new Error('Rating must be between 0 and 5')
  return partsToRating({ int, dec })
}

function adjustInteger(parts: RatingParts, delta: number): RatingParts {
  let int = parts.int + delta
  if (int < 0) int = 0
  if (int > 5) int = 5
  if (int === 5) return { int: 5, dec: 0 }
  return { ...parts, int }
}

function adjustDecimal(parts: RatingParts, delta: number): RatingParts {
  if (parts.int === 5) return { int: 5, dec: 0 }

  let { int, dec } = parts
  dec += delta

  if (dec > 9) {
    dec = 0
    int = Math.min(5, int + 1)
    if (int === 5) dec = 0
  } else if (dec < 0) {
    dec = 9
    int = Math.max(0, int - 1)
  }

  return { int, dec }
}

const arrowButtonStyle: CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 0,
  width: 16,
  height: 12,
  cursor: 'pointer',
  fontSize: 9,
  lineHeight: 1,
  color: '#555',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const partInputStyle: CSSProperties = {
  width: 22,
  font: 'inherit',
  fontSize: 'inherit',
  textAlign: 'center',
  border: '1px solid #99a',
  borderRadius: 3,
  padding: '2px 0',
  boxSizing: 'border-box',
  background: '#fff',
}

const ratingEditorStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
}

const ratingPartsRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
}

const spinnerColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0,
}

function RatingPartSpinner({
  label,
  value,
  disabled,
  onChange,
  onIncrement,
  onDecrement,
}: {
  label: string
  value: string
  disabled?: boolean
  onChange: (next: string) => void
  onIncrement: () => void
  onDecrement: () => void
}) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      onIncrement()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      onDecrement()
    }
  }

  return (
    <div style={spinnerColumnStyle}>
      <button
        type="button"
        style={{ ...arrowButtonStyle, opacity: disabled ? 0.4 : 1 }}
        disabled={disabled}
        aria-label={`Increase ${label}`}
        onClick={onIncrement}
      >
        ▲
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        aria-label={label}
        style={partInputStyle}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 1))}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        style={{ ...arrowButtonStyle, opacity: disabled ? 0.4 : 1 }}
        disabled={disabled}
        aria-label={`Decrease ${label}`}
        onClick={onDecrement}
      >
        ▼
      </button>
    </div>
  )
}

function selectAllInInput(element: HTMLInputElement) {
  element.focus({ preventScroll: true })
  element.select()
}

function useSelectAllOnEdit(editing: boolean, inputRef: React.RefObject<HTMLInputElement | null>) {
  const selectAllOnFocusRef = useRef(true)

  useLayoutEffect(() => {
    if (!editing) return

    const element = inputRef.current
    if (!element) return

    selectAllInInput(element)
    selectAllOnFocusRef.current = true

    const timeoutId = window.setTimeout(() => {
      if (inputRef.current) selectAllInInput(inputRef.current)
    }, 0)
    const rafId = window.requestAnimationFrame(() => {
      if (inputRef.current) selectAllInInput(inputRef.current)
    })

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(rafId)
    }
  }, [editing, inputRef])

  return {
    selectAllOnFocusRef,
    onInputMouseDown(event: MouseEvent<HTMLInputElement>) {
      event.stopPropagation()
      if (selectAllOnFocusRef.current) {
        event.preventDefault()
        selectAllInInput(event.currentTarget)
      }
    },
    onInputFocus(event: React.FocusEvent<HTMLInputElement>) {
      if (!selectAllOnFocusRef.current) return
      selectAllInInput(event.currentTarget)
      selectAllOnFocusRef.current = false
    },
    onInputClick(event: MouseEvent<HTMLInputElement>) {
      event.stopPropagation()
      if (selectAllOnFocusRef.current) {
        selectAllInInput(event.currentTarget)
        selectAllOnFocusRef.current = false
      }
    },
  }
}

export function EditableReviewRatingCell({
  label,
  wineId,
  userId,
  review,
  onReviewChange,
}: ReviewEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [intDraft, setIntDraft] = useState('')
  const [decDraft, setDecDraft] = useState('')
  const [textDraft, setTextDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const value = review?.overall_score ?? null
  const display = formatRating(value)

  function setPartsDraft(parts: RatingParts) {
    setIntDraft(String(parts.int))
    setDecDraft(String(parts.dec))
    setTextDraft(partsToRating(parts).toFixed(1))
  }

  function beginEditing(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    event.preventDefault()
    setError(null)
    const parts = ratingToParts(value)
    if (parts) {
      setPartsDraft(parts)
    } else {
      setIntDraft('')
      setDecDraft('')
      setTextDraft('')
    }
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setError(null)
  }

  function currentPartsFromDraft(): RatingParts | null {
    if (!intDraft.trim() && !decDraft.trim()) return null
    const int = parseInt(intDraft, 10)
    const dec = decDraft.trim() ? parseInt(decDraft, 10) : 0
    if (!Number.isFinite(int) || !Number.isFinite(dec)) return null
    return { int, dec }
  }

  function applyParts(parts: RatingParts | null) {
    if (!parts) {
      setIntDraft('')
      setDecDraft('')
      setTextDraft('')
      return
    }
    const clamped = parts.int === 5 ? { int: 5, dec: 0 } : parts
    setPartsDraft(clamped)
  }

  function onTextDraftChange(raw: string) {
    setTextDraft(raw)
    const trimmed = raw.trim()
    if (!trimmed) {
      setIntDraft('')
      setDecDraft('')
      return
    }
    try {
      const parsed = parseRating(trimmed)
      if (parsed == null) {
        setIntDraft('')
        setDecDraft('')
        return
      }
      const parts = ratingToParts(parsed)
      if (parts) {
        setIntDraft(String(parts.int))
        setDecDraft(String(parts.dec))
      }
    } catch {
      // keep partial text while typing
    }
  }

  async function submit() {
    if (saving) return

    let parsed: number | null
    try {
      if (textDraft.trim()) {
        parsed = parseRating(textDraft)
      } else {
        parsed = parseRatingParts(intDraft, decDraft)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid rating')
      return
    }

    if (parsed === value) {
      cancel()
      return
    }

    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, { overall_score: parsed })

    setSaving(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewField({
      userId,
      wineId,
      reviewId: review?.id,
      field: 'overall_score',
      value: parsed,
    })

    setSaving(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save rating.')
      return
    }

    onReviewChange(result.review)
    setEditing(false)
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  function onEditorBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null
    if (!event.currentTarget.contains(next)) {
      void submit()
    }
  }

  if (editing) {
    const parts = currentPartsFromDraft() ?? { int: 0, dec: 0 }
    const atMax = parts.int === 5

    return (
      <div
        style={ratingEditorStyle}
        onClick={(event) => event.stopPropagation()}
        onBlur={onEditorBlur}
      >
        <div style={ratingPartsRowStyle}>
          <RatingPartSpinner
            label={`${label} whole number`}
            value={intDraft}
            disabled={saving}
            onChange={(next) => {
              setIntDraft(next)
              if (next && decDraft) {
                try {
                  setTextDraft(parseRatingParts(next, decDraft)?.toFixed(1) ?? '')
                } catch {
                  setTextDraft('')
                }
              } else {
                setTextDraft('')
              }
            }}
            onIncrement={() => applyParts(adjustInteger(parts, 1))}
            onDecrement={() => applyParts(adjustInteger(parts, -1))}
          />
          <span style={{ padding: '0 1px', color: '#666' }}>.</span>
          <RatingPartSpinner
            label={`${label} decimal`}
            value={decDraft}
            disabled={saving || atMax}
            onChange={(next) => {
              setDecDraft(next)
              if (intDraft && next) {
                try {
                  setTextDraft(parseRatingParts(intDraft, next)?.toFixed(1) ?? '')
                } catch {
                  setTextDraft('')
                }
              } else if (intDraft) {
                try {
                  setTextDraft(parseRatingParts(intDraft, '0')?.toFixed(1) ?? '')
                } catch {
                  setTextDraft('')
                }
              } else {
                setTextDraft('')
              }
            }}
            onIncrement={() => applyParts(adjustDecimal(parts, 1))}
            onDecrement={() => applyParts(adjustDecimal(parts, -1))}
          />
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={textDraft}
          disabled={saving}
          aria-label={label}
          placeholder="0.0–5.0"
          style={{ ...inputStyle, width: 56 }}
          autoFocus
          onChange={(event) => onTextDraftChange(event.target.value)}
          onKeyDown={onEditorKeyDown}
        />
        {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <button
        type="button"
        style={{ ...displayButtonStyle, opacity: saving ? 0.5 : 1 }}
        disabled={saving}
        aria-label={`Edit ${label}`}
        onMouseDown={beginEditing}
      >
        {display}
      </button>
      {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
    </div>
  )
}

export function EditableReviewNotesCell({
  label,
  wineId,
  userId,
  review,
  onReviewChange,
}: ReviewEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const value = review?.tasting_notes?.trim() ?? ''
  const display = value || '-'
  const { onInputMouseDown, onInputFocus, onInputClick, selectAllOnFocusRef } =
    useSelectAllOnEdit(editing, inputRef)

  function beginEditing(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    event.preventDefault()
    setError(null)
    setDraft(value)
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
    const current = value || null

    if (parsed === current) {
      cancel()
      return
    }

    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, { tasting_notes: parsed })

    setSaving(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewField({
      userId,
      wineId,
      reviewId: review?.id,
      field: 'tasting_notes',
      value: parsed,
    })

    setSaving(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save notes.')
      return
    }

    onReviewChange(result.review)
    setEditing(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          disabled={saving}
          aria-label={label}
          style={inputStyle}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onMouseDown={onInputMouseDown}
          onFocus={onInputFocus}
          onClick={onInputClick}
        />
        {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <button
        type="button"
        style={{ ...displayButtonStyle, opacity: saving ? 0.5 : 1 }}
        disabled={saving}
        aria-label={`Edit ${label}`}
        onMouseDown={beginEditing}
      >
        {display}
      </button>
      {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
    </div>
  )
}
