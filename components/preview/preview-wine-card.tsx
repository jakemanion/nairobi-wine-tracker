'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { ImageWithFallback } from '@/components/preview/image-with-fallback'
import {
  getReviewPanelStyle,
  PreviewWishlistPicker,
} from '@/components/preview/preview-wishlist-picker'
import { PreviewTriedStatusPicker } from '@/components/preview/preview-tried-status-picker'
import {
  colourRibbonStyle,
  lowestPrice,
  type PreviewWineCardData,
} from '@/lib/preview/wine-card-model'
import { saveReviewField } from '@/lib/reviews'
import type { WishlistValue } from '@/lib/reviews'

type PreviewWineCardProps = {
  wine: PreviewWineCardData
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
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

function VivinoCircle({ rating, url }: { rating: number; url: string | null }) {
  const inner = (
    <div
      className="w-10 h-10 rounded-full flex-shrink-0 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #3A2808, #6A4A14)',
        border: '2px solid #7A5A18',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      <span
        className="text-[12px] font-bold leading-none tabular-nums"
        style={{ color: '#D4A840', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {rating.toFixed(1)}
      </span>
      <span className="text-[7px] leading-none" style={{ color: '#907040' }}>
        vivino
      </span>
    </div>
  )

  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex-shrink-0">
        {inner}
      </a>
    )
  }

  return inner
}

function RatingSlider({
  value,
  disabled,
  onChange,
  onCommit,
}: {
  value: number
  disabled?: boolean
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
        style={{ color: '#C0BCB4', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export function PreviewWineCard({ wine, userId, review, onReviewChange }: PreviewWineCardProps) {
  const wishlist = normalizeWishlist(review?.wishlist)
  const isIgnored = wishlist === 0
  const minPrice = lowestPrice(wine.prices)
  const ribbon = colourRibbonStyle(wine.colour)

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
      className="relative flex overflow-hidden transition-opacity duration-300"
      style={{
        background: '#222228',
        border: '1px solid #343440',
        borderRadius: '0 12px 12px 12px',
        boxShadow: isIgnored
          ? 'none'
          : '0 6px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)',
        opacity: isIgnored ? 0.4 : 1,
      }}
    >
      <div
        className="absolute top-0 left-0 overflow-hidden z-10 pointer-events-none"
        style={{ width: 56, height: 56 }}
      >
        <div
          style={{
            position: 'absolute',
            top: -4,
            left: -16,
            width: 88,
            padding: '5px 0',
            transform: 'rotate(-45deg)',
            transformOrigin: 'center',
            background: ribbon.background,
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.12em',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            {ribbon.label}
          </span>
        </div>
      </div>

      <div
        className="w-[68px] flex-shrink-0 flex items-center justify-center py-2 px-1.5"
        style={{ background: '#1A1A20' }}
      >
        <ImageWithFallback
          src={wine.image ?? undefined}
          alt={wine.name}
          className="h-28 w-full object-contain"
        />
      </div>

      <div
        className="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col justify-between gap-1.5"
        style={{ borderRight: '1px solid #2E2E3A' }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 pt-0.5">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.14em] leading-none mb-0.5"
              style={{ color: '#C93048', fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {wine.producer}
            </p>
            <h3
              className="text-sm font-semibold leading-snug"
              style={{ color: '#EDE8E0', fontFamily: 'var(--font-playfair), serif' }}
            >
              {wine.name}
            </h3>
          </div>
          {wine.vivinoRating != null ? (
            <VivinoCircle rating={wine.vivinoRating} url={wine.vivinoUrl} />
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#5A5868' }} />
          <span
            className="text-[11px] truncate"
            style={{ color: '#7A7888', fontFamily: 'var(--font-dm-sans), sans-serif' }}
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
                  background: '#2A2A34',
                  border: '1px solid #3A3A48',
                  color: '#9A98A8',
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
                    color: isLowest ? '#C93048' : '#606070',
                    fontWeight: isLowest ? 700 : 400,
                  }}
                >
                  <span style={{ color: '#484858' }}>{listing.shop}: </span>
                  {formatPrice(listing.price)}
                </span>
              )
            })
          ) : (
            <span className="text-[11px]" style={{ color: '#606070' }}>
              No listings
            </span>
          )}
        </div>
      </div>

      <div
        className="flex-shrink-0 px-3.5 py-2.5 flex flex-col gap-2 transition-colors duration-300"
        style={{ width: '44%', ...getReviewPanelStyle(wishlist) }}
      >
        <div className="flex items-center gap-2">
          <PreviewWishlistPicker
            wineId={wine.id}
            userId={userId}
            review={review}
            onReviewChange={onReviewChange}
          />
          <PreviewTriedStatusPicker
            wineId={wine.id}
            userId={userId}
            review={review}
            onReviewChange={onReviewChange}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[9px] uppercase tracking-wider mb-1"
              style={{ color: '#5A5868', fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              My Rating
            </p>
            <RatingSlider
              value={ratingDraft}
              disabled={savingRating}
              onChange={setRatingDraft}
              onCommit={(v) => void saveRating(v)}
            />
          </div>
        </div>

        <textarea
          value={notesDraft}
          disabled={savingNotes}
          placeholder="Tasting notes, pairings…"
          rows={2}
          className="w-full text-[11px] resize-none focus:outline-none transition-colors leading-relaxed rounded-lg px-2.5 py-1.5 disabled:opacity-60"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid #3A3848',
            color: '#C0BCB4',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            caretColor: '#C93048',
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
