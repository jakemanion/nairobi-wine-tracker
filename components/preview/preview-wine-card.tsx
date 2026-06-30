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

function VivinoCircle({ rating, url }: { rating: number | null; url: string | null }) {
  const hasRating = rating != null

  const circle = (
    <div className="group/vivino relative flex flex-col items-center flex-shrink-0 pb-1">
      <div
        className="rounded-full flex items-center justify-center transition-all duration-200 ease-out w-11 h-11 group-hover/vivino:w-[52px] group-hover/vivino:h-[52px]"
        style={{
          background: hasRating
            ? 'linear-gradient(145deg, #503408 0%, #9A7018 55%, #6A5010 100%)'
            : 'linear-gradient(145deg, #2A2A32 0%, #40404C 55%, #32323C 100%)',
          border: hasRating ? '2.5px solid #C89828' : '2px solid #5E5E6A',
          boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
        }}
      >
        <span
          className={`font-bold text-center leading-none transition-all duration-200 ${
            hasRating
              ? 'tabular-nums text-[15px] group-hover/vivino:text-[18px]'
              : 'text-[7px] group-hover/vivino:text-[7.5px] px-1'
          }`}
          style={{
            color: hasRating ? '#FFD878' : '#A8A4B0',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            letterSpacing: hasRating ? '-0.03em' : '0.02em',
            lineHeight: hasRating ? 1 : 1.15,
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
      {hasRating ? (
        <span
          className="absolute -bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-semibold uppercase tracking-[0.12em] opacity-0 group-hover/vivino:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
          style={{ color: '#C8A040', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          vivino
        </span>
      ) : null}
    </div>
  )

  if (url && hasRating) {
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
          <div className="flex-1 min-w-0 pt-0.5">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.14em] leading-none mb-0.5"
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
          </div>
        </div>

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
