'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
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
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
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
  return n
}

function formatRating(value: number | null | undefined): string {
  if (value == null) return '-'
  return String(value)
}

export function EditableReviewRatingCell({
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

  const value = review?.overall_score ?? null
  const display = formatRating(value)

  useEffect(() => {
    if (editing) {
      setDraft(value == null ? '' : String(value))
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  function cancel() {
    setEditing(false)
    setError(null)
  }

  async function submit() {
    if (saving) return

    let parsed: number | null
    try {
      parsed = parseRating(draft)
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
          inputMode="decimal"
          value={draft}
          disabled={saving}
          aria-label={label}
          style={inputStyle}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
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
        onClick={() => setEditing(true)}
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

  useEffect(() => {
    if (editing) {
      setDraft(value)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

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
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
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
        onClick={() => setEditing(true)}
      >
        {display}
      </button>
      {error && <span style={{ color: '#c33', fontSize: 10 }}>{error}</span>}
    </div>
  )
}
