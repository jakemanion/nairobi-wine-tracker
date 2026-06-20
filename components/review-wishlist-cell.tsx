'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import type { WineReview } from '@/components/wine-table'
import { saveReviewWishlistField, type WishlistValue } from '@/lib/reviews'

type EditableReviewWishlistCellProps = {
  label: string
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

const inactiveColor = '#bbb'
const wantColor = '#0a7'
const dontWantColor = '#c33'
const treatColor = '#b8860b'
const nullActiveColor = '#888'
const nullInactiveColor = '#ddd'

const optionButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '2px 4px',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function buildOptimisticReview(
  review: WineReview | null | undefined,
  wishlist: WishlistValue,
): WineReview {
  return {
    id: review?.id ?? 'pending',
    overall_score: review?.overall_score ?? null,
    value_score: review?.value_score ?? null,
    wishlist,
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
    tasting_notes: review?.tasting_notes ?? null,
    tasted_on: review?.tasted_on ?? null,
  }
}

function OutlinedStarIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.6 8.6 5.2 12.5 5.6 9.6 8.2 10.5 12 7 10.2 3.5 12 4.4 8.2 1.5 5.6 5.4 5.2Z"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FilledStarIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.6 8.6 5.2 12.5 5.6 9.6 8.2 10.5 12 7 10.2 3.5 12 4.4 8.2 1.5 5.6 5.4 5.2Z"
        fill={color}
        stroke={color}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TreatStarIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.6 8.6 5.2 12.5 5.6 9.6 8.2 10.5 12 7 10.2 3.5 12 4.4 8.2 1.5 5.6 5.4 5.2Z"
        fill={color}
        stroke={color}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <text
        x="7"
        y="9.2"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="700"
        fill="#fff"
      >
        $
      </text>
    </svg>
  )
}

const WISHLIST_OPTIONS: Array<{
  value: WishlistValue
  ariaLabel: string
  activeColor: string
  render: (active: boolean) => ReactNode
}> = [
  {
    value: null,
    ariaLabel: 'not set',
    activeColor: nullActiveColor,
    render: (active) => <OutlinedStarIcon color={active ? nullActiveColor : nullInactiveColor} />,
  },
  {
    value: 0,
    ariaLabel: "don't want",
    activeColor: dontWantColor,
    render: (active) => (
      <span
        style={{
          fontSize: 15,
          color: active ? dontWantColor : inactiveColor,
          fontWeight: active ? 700 : 400,
        }}
      >
        ✗
      </span>
    ),
  },
  {
    value: 1,
    ariaLabel: 'want',
    activeColor: wantColor,
    render: (active) => <FilledStarIcon color={active ? wantColor : inactiveColor} />,
  },
  {
    value: 2,
    ariaLabel: 'want as an expensive treat',
    activeColor: treatColor,
    render: (active) => <TreatStarIcon color={active ? treatColor : inactiveColor} />,
  },
]

export function EditableReviewWishlistCell({
  label,
  wineId,
  userId,
  review,
  onReviewChange,
}: EditableReviewWishlistCellProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = review?.wishlist ?? null

  async function setValue(next: WishlistValue) {
    if (saving || value === next) return

    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, next)

    setSaving(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewWishlistField({
      userId,
      wineId,
      reviewId: review?.id,
      value: next,
    })

    setSaving(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save wishlist.')
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
          gap: 1,
          opacity: saving ? 0.5 : 1,
        }}
      >
        {WISHLIST_OPTIONS.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.ariaLabel}
              type="button"
              style={{
                ...optionButtonStyle,
                cursor: saving ? 'wait' : 'pointer',
              }}
              disabled={saving}
              aria-label={`${label}: ${option.ariaLabel}`}
              aria-pressed={active}
              onClick={() => setValue(option.value)}
            >
              {option.render(active)}
            </button>
          )
        })}
      </div>
      {error && (
        <span style={{ color: '#c33', fontSize: 10, maxWidth: 110, lineHeight: 1.2 }}>
          {error}
        </span>
      )}
    </div>
  )
}
