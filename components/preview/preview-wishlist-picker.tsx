'use client'

import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { WineReview } from '@/components/wine-table'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { ReviewOnTick } from '@/components/preview/review-on-tick'
import { saveReviewWishlistField, type WishlistValue } from '@/lib/reviews'
import type { PreviewThemeMode, PanelTint, PreviewVisualStyle } from '@/lib/preview/preview-colors'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'

type PreviewWishlistPickerProps = {
  wineId: string
  userId: string
  review?: WineReview | null
  labelColor?: string
  panelTint?: PanelTint
  onReviewChange: (review: WineReview | null) => void
}

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value != null && value >= 1) return 1
  if (value === 0) return 0
  return null
}

export function getWishlistStateLabel(_value: WishlistValue): string {
  return 'BOOKMARK'
}

export const WISHLISTED_BUTTON_STYLE = {
  border: '#2A5030',
  bg: '#162010',
  color: '#50A060',
} as const

export const TRIAL_REVIEW_BUTTON_RADIUS = '9px'

export type TrialReviewControlRole = 'bookmark' | 'thumbUp' | 'thumbDown' | 'hide'

export type TrialReviewControlStyle = {
  bg: string
  border: string
  icon: string
  filled: boolean
}

/** Trial review-panel button chrome for normal / bookmarked / buy-again. */
export function getTrialReviewControlStyle(
  tint: PanelTint,
  role: TrialReviewControlRole,
  active: boolean,
): TrialReviewControlStyle {
  if (tint === 'wishlist') {
    const bookmark = { bg: '#99E2DA', border: '#029485', icon: '#029485', filled: true }
    if (role === 'bookmark') return bookmark
    if ((role === 'thumbDown' || role === 'hide') && active) return bookmark
    return { bg: '#28C6B5', border: '#029485', icon: '#029485', filled: false }
  }

  if (tint === 'thumbsUp') {
    const thumbsUp = { bg: '#FFDD42', border: '#C89010', icon: '#C89010', filled: true }
    if ((role === 'bookmark' && active) || role === 'thumbUp') return thumbsUp
    if ((role === 'thumbDown' || role === 'hide') && active) return thumbsUp
    return { bg: '#ECBF1F', border: '#C89010', icon: '#C89010', filled: false }
  }

  if ((role === 'thumbDown' || role === 'hide') && active) {
    return { bg: '#ffffff', border: '#E4E4EE', icon: '#BCBCCE', filled: true }
  }

  return { bg: '#F0F0F8', border: '#E4E4EE', icon: '#BCBCCE', filled: false }
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
  panelTint = 'none',
  onReviewChange,
}: PreviewWishlistPickerProps) {
  const { colors, visualStyle } = usePreviewTheme()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = normalizeWishlist(review?.wishlist)
  const active = value === 1
  const trial = visualStyle === 'trial'
  const trialStyle = trial ? getTrialReviewControlStyle(panelTint, 'bookmark', active) : null

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
      setError(result.error ?? 'Failed to save bookmark.')
      return
    }

    onReviewChange(result.review)
  }

  const borderColor = trialStyle
    ? trialStyle.border
    : active
      ? WISHLISTED_BUTTON_STYLE.border
      : colors.controlIdleBorder
  const bgColor = trialStyle
    ? trialStyle.bg
    : active
      ? WISHLISTED_BUTTON_STYLE.bg
      : colors.controlIdleBg
  const iconColor = trialStyle
    ? trialStyle.icon
    : active
      ? WISHLISTED_BUTTON_STYLE.color
      : colors.controlIdleIcon
  const iconFilled = trialStyle ? trialStyle.filled : active

  return (
    <div className="relative flex flex-col items-center gap-1 flex-shrink-0 m-0 p-0">
      <p
        className="m-0 p-0 text-[8px] uppercase tracking-wider leading-none text-center whitespace-nowrap"
        style={{ color: labelColor ?? colors.controlIdleIcon, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {getWishlistStateLabel(value)}
      </p>
      <InstantTooltip label={active ? 'Remove from bookmark' : 'Add to bookmark'}>
        <button
          type="button"
          aria-label={active ? 'Remove from bookmark' : 'Add to bookmark'}
          aria-pressed={active}
          disabled={saving}
          className="w-10 h-10 relative flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 m-0"
          style={{
            border: `${trial ? 1 : 2}px solid ${borderColor}`,
            background: bgColor,
            color: iconColor,
            borderRadius: trial ? TRIAL_REVIEW_BUTTON_RADIUS : colors.buttonRadius,
            boxShadow: trial ? 'none' : colors.controlShadow,
            opacity: saving ? 0.5 : 1,
            cursor: saving ? 'wait' : 'pointer',
          }}
          onClick={() => void toggle()}
        >
        <Bookmark
          size={24}
          strokeWidth={2}
          fill={iconFilled ? 'currentColor' : 'none'}
          className={iconFilled ? 'fill-current' : undefined}
          style={{ color: iconColor }}
        />
        {active ? <ReviewOnTick colors={colors} accentColor={iconColor} /> : null}
      </button>
      </InstantTooltip>
      {error ? (
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[9px] text-center whitespace-nowrap"
          style={{ color: colors.errorText, lineHeight: 1.2 }}
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
  visualStyle: PreviewVisualStyle = 'classic',
): string | null {
  if (visualStyle === 'trial') {
    if (tint === 'thumbsUp') return '#D4A820'
    if (tint === 'wishlist') return '#00A896'
    return null
  }

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
  visualStyle: PreviewVisualStyle = 'classic',
): PanelTint {
  if (visualStyle === 'trial') {
    if (thumbsUp) return 'thumbsUp'
    if (wishlisted) return 'wishlist'
    return 'none'
  }

  if (shortlisted) return 'shortlist'
  if (thumbsUp) return 'thumbsUp'
  if (wishlisted) return 'wishlist'
  return 'none'
}

export const TRIAL_BOOKMARK_BG = 'linear-gradient(172deg, #27C6B5 0%, #29B5A6 100%)'
export const TRIAL_THUMBS_UP_BG =
  'linear-gradient(145deg, #D4AF37 0%, #FFD722 38%, #F0C410 62%, #C9A227 100%)'

export function getReviewPanelStyle(
  tint: PanelTint,
  mode: PreviewThemeMode = 'dark',
  visualStyle: PreviewVisualStyle = 'classic',
): CSSProperties {
  if (visualStyle === 'trial') {
    const stroke = { borderLeft: '1px solid #E4E4EE' }
    if (tint === 'thumbsUp') return { background: TRIAL_THUMBS_UP_BG, ...stroke }
    if (tint === 'wishlist') return { background: TRIAL_BOOKMARK_BG, ...stroke }
    return { background: '#F0F0F8', ...stroke }
  }

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
