'use client'

import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { WISHLISTED_BUTTON_STYLE } from '@/components/preview/preview-wishlist-picker'

const SHORTLIST_TOOLTIP = 'Shortlist for your next buy'

type PreviewShortlistButtonProps = {
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

function normalizeShortlist(value: number | null | undefined): ShortlistValue {
  return value === 1 ? 1 : null
}

function buildOptimisticReview(
  review: WineReview | null | undefined,
  shortlist: ShortlistValue,
): WineReview {
  return {
    id: review?.id ?? 'pending',
    overall_score: review?.overall_score ?? null,
    value_score: review?.value_score ?? null,
    wishlist: review?.wishlist ?? null,
    tried_status: review?.tried_status ?? null,
    shortlist,
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
    tasting_notes: review?.tasting_notes ?? null,
    tasted_on: review?.tasted_on ?? null,
  }
}

export function PreviewShortlistButton({
  wineId,
  userId,
  review,
  onReviewChange,
}: PreviewShortlistButtonProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shortlisted = normalizeShortlist(review?.shortlist) === 1
  const label = shortlisted ? 'SHORTLISTED' : 'SHORTLIST'
  const inactiveColor = '#9894A4'
  const activeStyle = WISHLISTED_BUTTON_STYLE

  async function toggle() {
    if (saving) return

    const next: ShortlistValue = shortlisted ? null : 1
    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, next)

    setSaving(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewShortlistField({
      userId,
      wineId,
      reviewId: review?.id,
      value: next,
    })

    setSaving(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to update shortlist.')
      return
    }

    onReviewChange(result.review)
  }

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <p
        className="text-[8px] uppercase tracking-wider leading-tight text-center max-w-[54px]"
        style={{
          color: shortlisted ? activeStyle.color : inactiveColor,
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        {label}
      </p>
      <button
        type="button"
        title={SHORTLIST_TOOLTIP}
        aria-label={SHORTLIST_TOOLTIP}
        aria-pressed={shortlisted}
        disabled={saving}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
        style={{
          border: `2px solid ${shortlisted ? activeStyle.border : '#3A3848'}`,
          background: shortlisted ? activeStyle.bg : '#22222C',
          color: shortlisted ? activeStyle.color : inactiveColor,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          opacity: saving ? 0.5 : 1,
          cursor: saving ? 'wait' : 'pointer',
        }}
        onClick={() => void toggle()}
      >
        <ListChecks
          className={shortlisted ? 'fill-current' : undefined}
          size={20}
          strokeWidth={2}
          style={{ color: shortlisted ? activeStyle.color : inactiveColor }}
        />
      </button>
      {error ? (
        <span className="text-[9px] text-center" style={{ color: '#c05050', maxWidth: 72, lineHeight: 1.2 }}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
