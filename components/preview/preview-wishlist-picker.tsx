'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { WineReview } from '@/components/wine-table'
import { saveReviewWishlistField, type WishlistValue } from '@/lib/reviews'
import type { PreviewThemeMode } from '@/lib/preview/preview-colors'
import { getReviewPanelTextColors } from '@/lib/preview/preview-colors'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'

type PreviewWishlistPickerProps = {
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value != null && value >= 1) return 1
  if (value === 0) return 0
  return null
}

export function getWishlistStateLabel(value: WishlistValue): string {
  return value === 1 ? 'WISHLISTED' : 'WISHLIST'
}

export const WISHLISTED_BUTTON_STYLE = {
  border: '#2A5030',
  bg: '#162010',
  color: '#50A060',
} as const

function buildOptimisticReview(
  review: WineReview | null | undefined,
  wishlist: WishlistValue,
): WineReview {
  return {
    id: review?.id ?? 'pending',
    overall_score: review?.overall_score ?? null,
    value_score: review?.value_score ?? null,
    wishlist,
    tried_status: review?.tried_status ?? null,
    shortlist: review?.shortlist ?? null,
    hide: review?.hide ?? null,
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
    tasting_notes: review?.tasting_notes ?? null,
    tasted_on: review?.tasted_on ?? null,
  }
}

export function PreviewWishlistPicker({
  wineId,
  userId,
  review,
  onReviewChange,
}: PreviewWishlistPickerProps) {
  const { mode } = usePreviewTheme()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = normalizeWishlist(review?.wishlist)
  const active = value === 1
  const panelText = getReviewPanelTextColors(mode, value)

  async function toggle() {
    if (saving) return

    const next: WishlistValue = active ? 0 : 1
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

  const borderColor = active ? WISHLISTED_BUTTON_STYLE.border : '#3A3848'
  const bgColor = active ? WISHLISTED_BUTTON_STYLE.bg : '#22222C'
  const iconColor = active ? WISHLISTED_BUTTON_STYLE.color : '#9894A4'

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <p
        className="text-[8px] uppercase tracking-wider leading-tight text-center max-w-[54px]"
        style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {getWishlistStateLabel(value)}
      </p>
      <button
        type="button"
        title={active ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={active}
        disabled={saving}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
        style={{
          border: `2px solid ${borderColor}`,
          background: bgColor,
          color: iconColor,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          opacity: saving ? 0.5 : 1,
          cursor: saving ? 'wait' : 'pointer',
        }}
        onClick={() => void toggle()}
      >
        <Heart
          size={20}
          strokeWidth={2}
          className={active ? 'fill-current' : undefined}
          style={{ color: iconColor }}
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

export function getWishlistAccentColor(
  wishlist: WishlistValue,
  mode: PreviewThemeMode = 'dark',
): string {
  if (mode === 'light') {
    if (wishlist === 1) return '#38A050'
    return '#D8D4CC'
  }

  if (wishlist === 1) return '#48C868'
  return '#3A3848'
}

export function getReviewPanelStyle(
  wishlist: WishlistValue,
  mode: PreviewThemeMode = 'dark',
): CSSProperties {
  if (mode === 'light') {
    if (wishlist === 1) return { background: '#C4F0CC' }
    return { background: '#F5F3EF' }
  }

  if (wishlist === 1) return { background: '#1E6A30' }
  return { background: '#1C1C24' }
}
