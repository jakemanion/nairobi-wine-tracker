'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, EyeOff, MapPin } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { LoggedOutLoginPromptOverlay } from '@/components/preview/logged-out-login-prompt'
import { PreviewBottleImage } from '@/components/preview/preview-bottle-image'
import {
  getReviewPanelStyle,
  getWishlistAccentColor,
  PreviewWishlistPicker,
} from '@/components/preview/preview-wishlist-picker'
import { PreviewShortlistButton } from '@/components/preview/preview-shortlist-button'
import { PreviewTriedStatusPicker } from '@/components/preview/preview-tried-status-picker'
import { UsageTipTarget } from '@/components/preview/usage-tip-target'
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
  isLoggedIn: boolean
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
  imagePriority?: boolean
}

function normalizeTriedStatus(value: number | null | undefined): TriedStatusValue {
  if (value === 1) return 1
  if (value === 2 || value === 3) return 2
  return null
}

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value != null && value >= 1) return 1
  if (value === 0) return 0
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
    tried_status: patch.tried_status !== undefined ? patch.tried_status : (review?.tried_status ?? null),
    shortlist: patch.shortlist !== undefined ? patch.shortlist : (review?.shortlist ?? null),
    hide: patch.hide !== undefined ? patch.hide : (review?.hide ?? null),
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
  if (rating >= 3.7 && rating < 3.8) return 'Good rating'
  return ''
}

function VivinoCircle({ rating, url }: { rating: number | null; url: string | null }) {
  const hasRating = rating != null
  const tier = getVivinoTier(rating)
  const style = VIVINO_TIER_STYLES[tier]
  const scoreLabel = getVivinoScoreLabel(rating)
  const isMatte = tier === 'grey' || tier === 'none'
  const isLink = Boolean(url)

  const content = (
    <div
      className={`group/vivino flex flex-col items-center flex-shrink-0 ${isLink ? 'cursor-pointer' : ''}`}
      style={{ width: 44 }}
    >
      <div className="relative flex flex-col items-center">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
            isLink ? 'group-hover/vivino:brightness-110 group-hover/vivino:shadow-lg' : ''
          }`}
          style={{
            background: style.background,
            border: `2.5px solid ${style.border}`,
            boxShadow: isMatte ? 'none' : '0 2px 10px rgba(0,0,0,0.45)',
            outline: isLink ? '1px solid transparent' : undefined,
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
      </div>
      {isLink ? (
        <span
          className="mt-0.5 flex items-center gap-0.5 text-[8px] font-semibold leading-none underline-offset-2 group-hover/vivino:underline"
          style={{ color: style.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Vivino
          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" aria-hidden />
        </span>
      ) : null}
      {scoreLabel ? (
        <p
          className="mt-1 text-[9px] font-medium text-center leading-snug"
          style={{
            color: style.text,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            maxWidth: 60,
          }}
        >
          {scoreLabel}
        </p>
      ) : null}
    </div>
  )

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex-shrink-0 no-underline text-inherit"
        title="View on Vivino"
        aria-label="View on Vivino"
      >
        {content}
      </a>
    )
  }

  return content
}

function HideButton({
  active,
  saving,
  panelLabelColor,
  onClick,
}: {
  active: boolean
  saving: boolean
  panelLabelColor: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={active ? 'Unhide wine' : 'Hide wine'}
      aria-label={active ? 'Unhide wine' : 'Hide wine'}
      aria-pressed={active}
      disabled={saving}
      className="flex flex-col items-center gap-0.5 flex-shrink-0 transition-all hover:scale-105"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: saving ? 'wait' : 'pointer',
        opacity: saving ? 0.5 : 1,
      }}
      onClick={onClick}
    >
      <div
        className="w-6 h-6 rounded flex items-center justify-center"
        style={{
          border: `1.5px solid ${active ? '#5A3030' : '#3A3848'}`,
          background: active ? '#2A1C1C' : '#22222C',
          color: active ? '#F08080' : '#9894A4',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }}
      >
        <EyeOff size={13} strokeWidth={2} />
      </div>
      <span
        className="text-[5px] uppercase tracking-wider leading-none"
        style={{
          color: active ? '#F08080' : panelLabelColor,
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        Hide
      </span>
    </button>
  )
}

export function PreviewWineCard({
  wine,
  isLoggedIn,
  userId,
  review,
  onReviewChange,
  imagePriority = false,
}: PreviewWineCardProps) {
  const { colors, mode } = usePreviewTheme()
  const wishlist = normalizeWishlist(review?.wishlist)
  const triedStatus = normalizeTriedStatus(review?.tried_status)
  const isHidden = review?.hide === true
  const isDimmed = triedStatus === 2 || isHidden
  const minPrice = lowestPrice(wine.prices)
  const ribbon = colourRibbonStyle(wine.colour)
  const panelText = getReviewPanelTextColors(mode, wishlist)
  const wishlistOutline =
    wishlist === 1
      ? `3px solid ${getWishlistAccentColor(wishlist, mode)}`
      : `1px solid ${colors.cardBorder}`
  const infoOnDark = mode === 'light'
  const infoProducer = colors.producer
  const infoWineName = infoOnDark ? '#F5F2EC' : colors.wineName
  const infoMuted = infoOnDark ? '#C8C4D0' : colors.muted
  const infoGrapeBg = infoOnDark ? 'rgba(255,255,255,0.08)' : colors.grapeBg
  const infoGrapeBorder = infoOnDark ? 'rgba(255,255,255,0.12)' : colors.grapeBorder
  const infoGrapeText = infoOnDark ? '#E8E4DC' : colors.grapeText
  const priceAmountColor = '#FFFFFF'

  const [notesDraft, setNotesDraft] = useState(review?.tasting_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingHide, setSavingHide] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const notesDirtyRef = useRef(false)

  useEffect(() => {
    if (!notesDirtyRef.current) {
      setNotesDraft(review?.tasting_notes ?? '')
    }
  }, [review?.tasting_notes])

  async function saveNotes() {
    if (!isLoggedIn) return
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

  async function toggleHide() {
    if (!isLoggedIn) return
    const next = !isHidden
    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, { hide: next })

    setSavingHide(true)
    setError(null)
    onReviewChange(optimisticReview)

    const result = await saveReviewField({
      userId,
      wineId: wine.id,
      reviewId: review?.id,
      field: 'hide',
      value: next,
    })

    setSavingHide(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to update hide.')
      return
    }

    onReviewChange(result.review)
  }

  return (
    <div
      className="relative flex items-stretch overflow-hidden transition-opacity duration-300"
      style={{
        background: colors.cardBg,
        border: wishlistOutline,
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
        className="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col justify-between gap-1.5 relative"
        style={{
          background: colors.wineInfoBg,
          boxShadow: colors.wineInfoSheen,
          borderRight: `1px solid ${colors.infoBorder}`,
        }}
      >
        <div className="flex items-start gap-2.5 pr-2">
          <VivinoCircle rating={wine.vivinoRating} url={wine.vivinoUrl} />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.14em] leading-none"
              style={{ color: infoProducer, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {wine.producer}
            </p>
            <h3
              className="text-sm font-semibold leading-snug"
              style={{ color: infoWineName, fontFamily: 'var(--font-playfair), serif' }}
            >
              {wine.name}
            </h3>

            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: infoMuted }} />
              <span
                className="text-[11px] truncate"
                style={{ color: infoMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
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
                      background: infoGrapeBg,
                      border: `1px solid ${infoGrapeBorder}`,
                      color: infoGrapeText,
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
                  const content = (
                    <>
                      <span style={{ color: colors.priceShop }}>{listing.shop}: </span>
                      <span
                        style={{
                          color: priceAmountColor,
                          fontWeight: isLowest ? 700 : 500,
                        }}
                      >
                        {formatPrice(listing.price)}
                      </span>
                    </>
                  )

                  if (listing.url) {
                    return (
                      <a
                        key={listing.shop}
                        href={listing.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] no-underline hover:underline decoration-white/70 underline-offset-2"
                        style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
                      >
                        {content}
                      </a>
                    )
                  }

                  return (
                    <span
                      key={listing.shop}
                      className="text-[11px]"
                      style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
                    >
                      {content}
                    </span>
                  )
                })
              ) : (
                <span className="text-[11px]" style={{ color: infoMuted }}>
                  No listings
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative flex-shrink-0 px-2.5 py-2.5 flex flex-col gap-1.5 transition-colors duration-300 min-w-0 group/review-panel"
        style={{
          width: '35.2%',
          ...getReviewPanelStyle(wishlist, mode),
        }}
      >
        {!isLoggedIn ? <LoggedOutLoginPromptOverlay hoverGroup="review-panel" /> : null}

        <div className="absolute top-1.5 right-1.5 z-10"
          style={{ pointerEvents: isLoggedIn ? 'auto' : 'none', opacity: isLoggedIn ? 1 : 0.42 }}
        >
          <HideButton
            active={isHidden}
            saving={savingHide}
            panelLabelColor={panelText.muted}
            onClick={() => void toggleHide()}
          />
        </div>

        <div
          className="flex flex-col gap-1.5 min-h-0"
          style={{
            pointerEvents: isLoggedIn ? 'auto' : 'none',
            opacity: isLoggedIn ? 1 : 0.42,
          }}
        >
          <div className="flex items-end gap-1.5 min-w-0 pr-8">
            <UsageTipTarget tipId="wishlist-button">
              <PreviewWishlistPicker
                wineId={wine.id}
                userId={userId}
                review={review}
                onReviewChange={onReviewChange}
              />
            </UsageTipTarget>
            <UsageTipTarget tipId="shortlist-button">
              <PreviewShortlistButton
                wineId={wine.id}
                userId={userId}
                review={review}
                disabled={!isLoggedIn}
                onReviewChange={onReviewChange}
              />
            </UsageTipTarget>
          </div>

          <div className="flex items-start gap-1.5">
            <UsageTipTarget tipId="notes-textfield" className="flex-1 min-w-0">
              <textarea
                value={notesDraft}
                disabled={savingNotes}
                placeholder="Notes"
                rows={2}
                className="w-full text-[11px] resize-none focus:outline-none transition-colors leading-relaxed rounded-lg px-2 py-1.5 disabled:opacity-60"
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
            </UsageTipTarget>
            <UsageTipTarget tipId="tried-button" className="flex-shrink-0 pt-1">
              <PreviewTriedStatusPicker
                wineId={wine.id}
                userId={userId}
                review={review}
                onReviewChange={onReviewChange}
              />
            </UsageTipTarget>
          </div>

          {error ? (
            <p className="text-[10px]" style={{ color: '#c05050' }}>
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
