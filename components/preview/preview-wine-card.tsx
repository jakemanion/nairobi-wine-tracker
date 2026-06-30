'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { PreviewBottleImage } from '@/components/preview/preview-bottle-image'
import {
  getReviewPanelStyle,
  PreviewWishlistPicker,
} from '@/components/preview/preview-wishlist-picker'
import { PreviewTriedStatusPicker } from '@/components/preview/preview-tried-status-picker'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  colourRibbonStyle,
  lowestPrice,
  type PreviewWineCardData,
} from '@/lib/preview/wine-card-model'
import { getReviewPanelTextColors } from '@/lib/preview/preview-colors'
import { saveReviewField } from '@/lib/reviews'
import type { WishlistValue, TriedStatusValue } from '@/lib/reviews'

type PreviewWineCardProps = {
  wine: PreviewWineCardData
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
  imagePriority?: boolean
}

function normalizeTriedStatus(value: number | null | undefined): TriedStatusValue {
  if (value === 0 || value === 1 || value === 2) return value
  return null
}

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return null
}

function buildOptimisticReview(
  review: WineReview | null | undefined,
  patch: Partial<WineReview>,
): WineReview {
  return {
    id: review?.id ?? 'pending',
    overall_score: patch.overall_score !== undefined ? patch.overall_score : (review?.overall_score ?? null),
    value_score: review?.value_score ?? null,
    wishlist: patch.wishlist !== undefined ? patch.wishlist : (review?.wishlist ?? null),
    tried_status: review?.tried_status ?? null,
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
    tasting_notes:
      patch.tasting_notes !== undefined ? patch.tasting_notes : (review?.tasting_notes ?? null),
    tasted_on: review?.tasted_on ?? null,
  }
}

function formatPrice(value: number): string {
  return value.toLocaleString('en-KE', { maximumFractionDigits: 0 })
}

type VivinoTier = 'gold' | 'silver' | 'bronze' | 'grey' | 'none'

function getVivinoTier(rating: number | null): VivinoTier {
  if (rating == null) return 'none'
  if (rating >= 4) return 'gold'
  if (rating >= 3.8) return 'silver'
  if (rating >= 3.7) return 'bronze'
  return 'grey'
}

const VIVINO_TIER_STYLES: Record<
  VivinoTier,
  { background: string; border: string; text: string; label: string }
> = {
  gold: {
    background: 'linear-gradient(145deg, #5A3C08 0%, #B88820 52%, #7A580C 100%)',
    border: '#F0C840',
    text: '#FFF8E0',
    label: '#F0D060',
  },
  silver: {
    background: 'linear-gradient(145deg, #383C48 0%, #9098A8 52%, #585E6C 100%)',
    border: '#D8E0EC',
    text: '#FFFFFF',
    label: '#C8D0DC',
  },
  bronze: {
    background: 'linear-gradient(145deg, #4A2C10 0%, #A87038 52%, #704820 100%)',
    border: '#E0A060',
    text: '#FFF0E0',
    label: '#E8B878',
  },
  grey: {
    background: '#2A2A2E',
    border: '#4A4A50',
    text: '#D0CED4',
    label: '#98949E',
  },
  none: {
    background: '#2A2A2E',
    border: '#4A4A50',
    text: '#D0CED4',
    label: '#98949E',
  },
}

function getVivinoScoreLabel(rating: number | null): string {
  if (rating == null) return ''
  if (rating > 4.2) return 'Very highly rated'
  if (rating >= 4) return 'Highly rated'
  if (rating >= 3.8 && rating <= 3.9) return 'Well rated'
  return ''
}

function VivinoCircle({ rating, url }: { rating: number | null; url: string | null }) {
  const hasRating = rating != null
  const tier = getVivinoTier(rating)
  const style = VIVINO_TIER_STYLES[tier]
  const scoreLabel = getVivinoScoreLabel(rating)
  const isMatte = tier === 'grey' || tier === 'none'

  const circle = (
    <div className="group/vivino flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
      <div className="relative flex flex-col items-center">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: style.background,
            border: `2.5px solid ${style.border}`,
            boxShadow: isMatte ? 'none' : '0 2px 10px rgba(0,0,0,0.45)',
          }}
        >
          <span
            className={`font-bold text-center leading-none ${
              hasRating ? 'tabular-nums text-[15px]' : 'text-[7px] px-1'
            }`}
            style={{
              color: style.text,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              letterSpacing: hasRating ? '-0.03em' : '0.02em',
              lineHeight: hasRating ? 1 : 1.15,
              textShadow: isMatte ? 'none' : '0 1px 2px rgba(0,0,0,0.55)',
            }}
          >
            {hasRating ? (
              rating.toFixed(1)
            ) : (
              <>
                No
                <br />
                rating
              </>
            )}
          </span>
        </div>
        {url ? (
          <span
            className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 z-10 text-[7px] font-semibold leading-tight text-center opacity-0 group-hover/vivino:opacity-100 transition-opacity duration-200 pointer-events-none rounded px-1.5 py-0.5 max-w-[72px]"
            style={{
              color: '#F4F2F8',
              background: 'rgba(12, 12, 16, 0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            View on Vivino
          </span>
        ) : null}
      </div>
      {scoreLabel ? (
        <p
          className="mt-1 text-[7px] font-medium text-center leading-tight"
          style={{
            color: style.text,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            maxWidth: 52,
          }}
        >
          {scoreLabel}
        </p>
      ) : null}
    </div>
  )

  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex-shrink-0 no-underline">
        {circle}
      </a>
    )
  }

  return circle
}

function RatingSlider({
  value,
  disabled,
  valueColor,
  onChange,
  onCommit,
}: {
  value: number
  disabled?: boolean
  valueColor: string
  onChange: (v: number) => void
  onCommit: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={5}
        step={0.1}
        value={value}
        disabled={disabled}
        className="flex-1 h-1 cursor-pointer disabled:opacity-50"
        style={{ accentColor: '#C93048' }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onMouseUp={(e) => onCommit(parseFloat((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(parseFloat((e.target as HTMLInputElement).value))}
      />
      <span
        className="text-xs font-bold w-7 text-right tabular-nums"
        style={{ color: valueColor, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export function PreviewWineCard({
  wine,
  userId,
  review,
  onReviewChange,
  imagePriority = false,
}: PreviewWineCardProps) {
  const { colors, mode } = usePreviewTheme()
  const wishlist = normalizeWishlist(review?.wishlist)
  const triedStatus = normalizeTriedStatus(review?.tried_status)
  const isDimmed = wishlist === 0 || triedStatus === 2
  const ratingInactive = triedStatus == null
  const minPrice = lowestPrice(wine.prices)
  const ribbon = colourRibbonStyle(wine.colour)
  const panelText = getReviewPanelTextColors(mode, wishlist)
  const ratingLabelColor = ratingInactive ? panelText.muted : panelText.label
  const ratingValueColor = ratingInactive ? panelText.muted : panelText.body

  const [ratingDraft, setRatingDraft] = useState(review?.overall_score ?? 0)
  const [notesDraft, setNotesDraft] = useState(review?.tasting_notes ?? '')
  const [savingRating, setSavingRating] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const notesDirtyRef = useRef(false)

  useEffect(() => {
    setRatingDraft(review?.overall_score ?? 0)
    if (!notesDirtyRef.current) {
      setNotesDraft(review?.tasting_notes ?? '')
    }
  }, [review?.overall_score, review?.tasting_notes])

  async function saveRating(next: number) {
    const rounded = Math.round(next * 10) / 10
    const stored = review?.overall_score ?? null
    if (stored != null && Math.abs(stored - rounded) < 0.05) return
    if (stored == null && rounded === 0) return

    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, { overall_score: rounded })

    setSavingRating(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewField({
      userId,
      wineId: wine.id,
      reviewId: review?.id,
      field: 'overall_score',
      value: rounded,
    })

    setSavingRating(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save rating.')
      return
    }

    onReviewChange(result.review)
  }

  async function saveNotes() {
    notesDirtyRef.current = false
    const next = notesDraft.trim() || null
    const stored = review?.tasting_notes?.trim() || null
    if (next === stored) return

    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, { tasting_notes: next })

    setSavingNotes(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewField({
      userId,
      wineId: wine.id,
      reviewId: review?.id,
      field: 'tasting_notes',
      value: next,
    })

    setSavingNotes(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save notes.')
      return
    }

    onReviewChange(result.review)
    setNotesDraft(result.review.tasting_notes ?? '')
  }

  return (
    <div
      className="relative flex items-stretch overflow-hidden transition-opacity duration-300"
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '0 12px 12px 12px',
        boxShadow: isDimmed ? 'none' : colors.cardShadow,
        opacity: isDimmed ? 0.4 : 1,
      }}
    >
      <div
        className="absolute top-0 left-0 z-10 pointer-events-none"
        style={{
          background: ribbon.background,
          color: '#fff',
          fontSize: 9,
          fontWeight: 600,
          lineHeight: 1.2,
          padding: '3px 7px',
          borderBottomRightRadius: 8,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          letterSpacing: '0.02em',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        }}
      >
        {ribbon.label}
      </div>

      <div
        className="w-[96px] flex-shrink-0 self-stretch relative min-h-[112px]"
        style={{ background: colors.imageColumnBg }}
      >
        <PreviewBottleImage
          src={wine.image}
          alt={wine.name}
          priority={imagePriority}
        />
      </div>

      <div
        className="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col justify-between gap-1.5"
        style={{ borderRight: `1px solid ${colors.infoBorder}` }}
      >
        <div className="flex items-start gap-2.5">
          <VivinoCircle rating={wine.vivinoRating} url={wine.vivinoUrl} />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.14em] leading-none"
              style={{ color: colors.producer, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {wine.producer}
            </p>
            <h3
              className="text-sm font-semibold leading-snug"
              style={{ color: colors.wineName, fontFamily: 'var(--font-playfair), serif' }}
            >
              {wine.name}
            </h3>

            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: colors.muted }} />
              <span
                className="text-[11px] truncate"
                style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                {wine.region} · {wine.country}
              </span>
            </div>

            {wine.grapes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {wine.grapes.map((grape) => (
                  <span
                    key={grape}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: colors.grapeBg,
                      border: `1px solid ${colors.grapeBorder}`,
                      color: colors.grapeText,
                      fontFamily: 'var(--font-dm-sans), sans-serif',
                    }}
                  >
                    {grape}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {wine.prices.length > 0 ? (
                wine.prices.map((listing) => {
                  const isLowest = minPrice != null && listing.price === minPrice
                  return (
                    <span
                      key={listing.shop}
                      className="text-[11px]"
                      style={{
                        fontFamily: 'var(--font-dm-sans), sans-serif',
                        color: isLowest ? colors.priceLow : colors.priceMuted,
                        fontWeight: isLowest ? 700 : 400,
                      }}
                    >
                      <span style={{ color: colors.priceShop }}>{listing.shop}: </span>
                      {formatPrice(listing.price)}
                    </span>
                  )
                })
              ) : (
                <span className="text-[11px]" style={{ color: colors.priceMuted }}>
                  No listings
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-shrink-0 px-3.5 py-2.5 flex flex-col gap-2 transition-colors duration-300"
        style={{ width: '44%', ...getReviewPanelStyle(wishlist, mode) }}
      >
        <div className="flex items-end gap-2">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <p
              className="text-[9px] uppercase tracking-wider leading-none"
              style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              Wishlist
            </p>
            <PreviewWishlistPicker
              wineId={wine.id}
              userId={userId}
              review={review}
              onReviewChange={onReviewChange}
            />
          </div>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <p
              className="text-[9px] uppercase tracking-wider leading-none"
              style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              Tried
            </p>
            <PreviewTriedStatusPicker
              wineId={wine.id}
              userId={userId}
              review={review}
              onReviewChange={onReviewChange}
            />
          </div>
          <div
            className="flex-1 min-w-0 transition-opacity duration-200"
            style={{ opacity: ratingInactive ? 0.45 : 1 }}
          >
            <p
              className="text-[9px] uppercase tracking-wider mb-1"
              style={{ color: ratingLabelColor, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              My Rating
            </p>
            <RatingSlider
              value={ratingDraft}
              disabled={savingRating || ratingInactive}
              valueColor={ratingValueColor}
              onChange={setRatingDraft}
              onCommit={(v) => void saveRating(v)}
            />
          </div>
        </div>

        <textarea
          value={notesDraft}
          disabled={savingNotes}
          placeholder="Notes"
          rows={2}
          className="w-full text-[11px] resize-none focus:outline-none transition-colors leading-relaxed rounded-lg px-2.5 py-1.5 disabled:opacity-60"
          style={{
            background: panelText.notesBg,
            border: `1px solid ${panelText.notesBorder}`,
            color: panelText.notesText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            caretColor: colors.producer,
          }}
          onChange={(e) => {
            notesDirtyRef.current = true
            setNotesDraft(e.target.value)
          }}
          onBlur={() => void saveNotes()}
        />

        {error ? (
          <p className="text-[10px]" style={{ color: '#c05050' }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
