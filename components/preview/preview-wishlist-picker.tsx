'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { WineReview } from '@/components/wine-table'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { saveReviewWishlistField, type WishlistValue } from '@/lib/reviews'
import type { PreviewThemeMode, PanelTint } from '@/lib/preview/preview-colors'

type PreviewWishlistPickerProps = {
  wineId: string
  userId: string
  review?: WineReview | null
  labelColor?: string
  onReviewChange: (review: WineReview | null) => void
}

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value != null && value >= 1) return 1
  if (value === 0) return 0
  return null
}

export function getWishlistStateLabel(_value: WishlistValue): string {
  return 'WISHLIST'
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
  labelColor,
  onReviewChange,
}: PreviewWishlistPickerProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = normalizeWishlist(review?.wishlist)
  const active = value === 1

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
    <div className="relative flex flex-col items-center gap-1 flex-shrink-0 m-0 p-0">
      <p
        className="m-0 p-0 text-[8px] uppercase tracking-wider leading-none text-center whitespace-nowrap"
        style={{ color: labelColor ?? '#9894A4', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {getWishlistStateLabel(value)}
      </p>
      <InstantTooltip label={active ? 'Remove from wishlist' : 'Add to wishlist'}>
        <button
          type="button"
          aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={active}
          disabled={saving}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 m-0"
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
          size={24}
          strokeWidth={2}
          className={active ? 'fill-current' : undefined}
          style={{ color: iconColor }}
        />
      </button>
      </InstantTooltip>
      {error ? (
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[9px] text-center whitespace-nowrap"
          style={{ color: '#c05050', lineHeight: 1.2 }}
        >
          {error}
        </span>
      ) : null}
    </div>
  )
}

export function getCardBorderColor(
  tint: PanelTint,
  mode: PreviewThemeMode = 'dark',
): string | null {
  if (mode === 'light') {
    if (tint === 'shortlist') return '#4080D0'
    if (tint === 'thumbsUp') return '#D0A828'
    if (tint === 'wishlist') return '#38A050'
    return null
  }

  if (tint === 'shortlist') return '#4888E0'
  if (tint === 'thumbsUp') return '#E0C040'
  if (tint === 'wishlist') return '#48C868'
  return null
}

export function getReviewPanelTint(
  shortlisted: boolean,
  thumbsUp: boolean,
  wishlisted: boolean,
): PanelTint {
  if (shortlisted) return 'shortlist'
  if (thumbsUp) return 'thumbsUp'
  if (wishlisted) return 'wishlist'
  return 'none'
}

export function getReviewPanelStyle(
  tint: PanelTint,
  mode: PreviewThemeMode = 'dark',
): CSSProperties {
  if (mode === 'light') {
    if (tint === 'shortlist') return { background: '#C4D8F0' }
    if (tint === 'thumbsUp') return { background: 'linear-gradient(145deg, #FFF4D0 0%, #FFE8A0 52%, #FFF0C0 100%)' }
    if (tint === 'wishlist') return { background: '#C4F0CC' }
    return { background: '#F5F3EF' }
  }

  if (tint === 'shortlist') return { background: '#1A3060' }
  if (tint === 'thumbsUp') return { background: 'linear-gradient(145deg, #3A2C08 0%, #6A5010 52%, #4A3808 100%)' }
  if (tint === 'wishlist') return { background: '#1E6A30' }
  return { background: '#1C1C24' }
}
