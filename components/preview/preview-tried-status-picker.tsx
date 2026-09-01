'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { saveReviewTriedStatusField, type TriedStatusValue } from '@/lib/reviews'

type PreviewTriedStatusPickerProps = {
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

function normalizeTriedStatus(value: number | null | undefined): TriedStatusValue {
  if (value === 1) return 1
  if (value === 2 || value === 3) return 2
  return null
}

export function getTriedStateLabel(_value: TriedStatusValue): string {
  return 'TRIED?'
}

function buildOptimisticReview(
  review: WineReview | null | undefined,
  tried_status: TriedStatusValue,
): WineReview {
  return {
    id: review?.id ?? 'pending',
    overall_score: review?.overall_score ?? null,
    value_score: review?.value_score ?? null,
    wishlist: review?.wishlist ?? null,
    tried_status,
    shortlist: review?.shortlist ?? null,
    hide: review?.hide ?? null,
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
    tasting_notes: review?.tasting_notes ?? null,
    tasted_on: review?.tasted_on ?? null,
  }
}

export function PreviewTriedStatusPicker({
  wineId,
  userId,
  review,
  onReviewChange,
}: PreviewTriedStatusPickerProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = normalizeTriedStatus(review?.tried_status)

  async function setStatus(next: TriedStatusValue) {
    if (saving) return
    const toggle = value === next ? null : next
    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, toggle)

    setSaving(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewTriedStatusField({
      userId,
      wineId,
      reviewId: review?.id,
      value: toggle,
    })

    setSaving(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save tried status.')
      return
    }

    onReviewChange(result.review)
  }

  const upActive = value === 1
  const downActive = value === 2

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <div className="flex items-center gap-1">
        <InstantTooltip label="Buy again">
          <button
            type="button"
            aria-label="Buy again"
            aria-pressed={upActive}
            disabled={saving}
            className="rounded-lg flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              border: `1.5px solid ${upActive ? '#8A7020' : '#3A3848'}`,
              background: upActive ? '#3A2E08' : '#22222C',
              color: upActive ? '#E0C040' : '#9894A4',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              opacity: saving ? 0.5 : 1,
              cursor: saving ? 'wait' : 'pointer',
            }}
            onClick={() => void setStatus(1)}
          >
            <ThumbsUp size={15} strokeWidth={2} />
          </button>
        </InstantTooltip>
        <InstantTooltip label="Don't buy again">
          <button
            type="button"
            aria-label="Don't buy again"
            aria-pressed={downActive}
            disabled={saving}
            className="rounded-lg flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              border: `1.5px solid ${downActive ? '#5A3030' : '#3A3848'}`,
              background: downActive ? '#2A1C1C' : '#22222C',
              color: downActive ? '#F08080' : '#9894A4',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            opacity: saving ? 0.5 : 1,
            cursor: saving ? 'wait' : 'pointer',
          }}
          onClick={() => void setStatus(2)}
        >
          <ThumbsDown size={15} strokeWidth={2} />
        </button>
        </InstantTooltip>
      </div>
      {error ? (
        <span className="text-[9px] text-center" style={{ color: '#c05050', maxWidth: 72, lineHeight: 1.2 }}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
