'use client'

import { useState, type CSSProperties } from 'react'
import type { WineReview } from '@/components/wine-table'
import { saveReviewBoolField, type ReviewBoolField } from '@/lib/reviews'

type EditableReviewBoolCellProps = {
  label: string
  field: ReviewBoolField
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
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
      <rect
        x="1.5"
        y="1.5"
        width="11"
        height="11"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      <line
        x1="2.5"
        y1="11.5"
        x2="11.5"
        y2="2.5"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  )
}

const optionButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '2px 5px',
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export function EditableReviewBoolCell({
  label,
  field,
  wineId,
  userId,
  review,
  onReviewChange,
}: EditableReviewBoolCellProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = review?.[field] ?? null

  async function setValue(next: boolean | null) {
    if (saving || value === next) return

    const previousReview = review ?? null
    const optimisticReview: WineReview = {
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
      [field]: next,
    }

    setSaving(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewBoolField({
      userId,
      wineId,
      reviewId: review?.id,
      field,
      value: next,
    })

    setSaving(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save review.')
      return
    }

    onReviewChange(result.review)
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
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
            color: value === true ? tickActiveColor : inactiveColor,
            fontWeight: value === true ? 700 : 400,
            cursor: saving ? 'wait' : 'pointer',
          }}
          disabled={saving}
          aria-label={`${label}: yes`}
          aria-pressed={value === true}
          onClick={() => setValue(true)}
        >
          ✓
        </button>
        <button
          type="button"
          style={{
            ...optionButtonStyle,
            color: value === false ? crossActiveColor : inactiveColor,
            fontWeight: value === false ? 700 : 400,
            cursor: saving ? 'wait' : 'pointer',
          }}
          disabled={saving}
          aria-label={`${label}: no`}
          aria-pressed={value === false}
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
          aria-pressed={value == null}
          onClick={() => setValue(null)}
        >
          <NullIcon active={value == null} />
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
