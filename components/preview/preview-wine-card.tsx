'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, EyeOff, MapPin, Star } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { LoggedOutLoginPromptOverlay } from '@/components/preview/logged-out-login-prompt'
import { PreviewBottleImage } from '@/components/preview/preview-bottle-image'
import {
  getCardBorderColor,
  getReviewPanelStyle,
  getReviewPanelTint,
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
import { formatStarRating, vivinoToStarRating } from '@/lib/ratings/vivino-star-rating'
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

function WineStarRating({
  vivinoRating,
  vivinoUrl,
  mutedColor,
  emphasisColor,
}: {
  vivinoRating: number | null
  vivinoUrl: string | null
  mutedColor: string
  emphasisColor: string
}) {
  const starRating = vivinoToStarRating(vivinoRating)
  const hasVivino = vivinoRating != null
  const vivinoLabel = hasVivino ? `${vivinoRating.toFixed(1)} on Vivino` : 'Vivino'
  const starColor = '#E8B84A'

  const vivinoLine = (
    <span
      className="inline-flex items-center gap-0.5 text-[9px] font-medium leading-none underline-offset-2"
      style={{ color: mutedColor, fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      {vivinoLabel}
      {vivinoUrl ? <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" aria-hidden /> : null}
    </span>
  )

  return (
    <div className="flex flex-col items-start gap-1 flex-shrink-0 pt-0.5">
      {starRating != null ? (
        <div className="flex items-center gap-1" title={`${formatStarRating(starRating)} stars`}>
          <Star
            size={18}
            strokeWidth={0}
            className="flex-shrink-0"
            style={{ fill: starColor, color: starColor }}
            aria-hidden
          />
          <span
            className="tabular-nums text-[15px] font-bold leading-none"
            style={{
              color: emphasisColor,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              letterSpacing: '-0.03em',
            }}
          >
            {formatStarRating(starRating)}
          </span>
        </div>
      ) : (
        <span
          className="text-[9px] font-medium leading-snug"
          style={{ color: mutedColor, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          No rating
        </span>
      )}

      {vivinoUrl ? (
        <a
          href={vivinoUrl}
          target="_blank"
          rel="noreferrer"
          className="no-underline text-inherit hover:underline"
          title="View on Vivino"
          aria-label={hasVivino ? `${vivinoRating!.toFixed(1)} on Vivino` : 'View on Vivino'}
        >
          {vivinoLine}
        </a>
      ) : hasVivino ? (
        vivinoLine
      ) : null}
    </div>
  )
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
  const borderColor = active ? '#5A3030' : '#3A3848'
  const bgColor = active ? '#2A1C1C' : '#22222C'
  const iconColor = active ? '#F08080' : '#9894A4'

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <p
        className="text-[6px] uppercase tracking-wider leading-tight text-center w-[54px] h-[18px] flex items-end justify-center"
        style={{ color: panelLabelColor, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        Not interested
      </p>
      <button
        type="button"
        title={active ? 'Show wine again' : 'Not interested'}
        aria-label={active ? 'Show wine again' : 'Not interested'}
        aria-pressed={active}
        disabled={saving}
        className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
        style={{
          border: `2px solid ${borderColor}`,
          background: bgColor,
          color: iconColor,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          opacity: saving ? 0.5 : 1,
          cursor: saving ? 'wait' : 'pointer',
        }}
        onClick={onClick}
      >
        <EyeOff size={24} strokeWidth={2} style={{ color: iconColor }} />
      </button>
    </div>
  )
}

function wineNameHref(wine: PreviewWineCardData): string | null {
  if (wine.vivinoUrl) return wine.vivinoUrl
  const min = lowestPrice(wine.prices)
  if (min == null) return null
  const cheapestWithUrl = wine.prices.find((listing) => listing.price === min && listing.url)
  if (cheapestWithUrl?.url) return cheapestWithUrl.url
  return wine.prices.find((listing) => listing.url)?.url ?? null
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
  const shortlisted = review?.shortlist === 1
  const isHidden = review?.hide === true
  const isDimmed = triedStatus === 2 || isHidden
  const minPrice = lowestPrice(wine.prices)
  const nameHref = wineNameHref(wine)
  const ribbon = colourRibbonStyle(wine.colour)
  const panelTint = getReviewPanelTint(shortlisted, triedStatus === 1, wishlist === 1)
  const panelText = getReviewPanelTextColors(mode, panelTint)
  const cardBorderColor = getCardBorderColor(panelTint, mode)
  const cardBorder = cardBorderColor
    ? `3px solid ${cardBorderColor}`
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
        border: cardBorder,
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
          <WineStarRating
            vivinoRating={wine.vivinoRating}
            vivinoUrl={wine.vivinoUrl}
            mutedColor={infoMuted}
            emphasisColor={infoWineName}
          />
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
              {nameHref ? (
                <a
                  href={nameHref}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline hover:underline underline-offset-2"
                  style={{ color: 'inherit' }}
                  title={wine.vivinoUrl ? 'View on Vivino' : 'View cheapest store listing'}
                >
                  {wine.name}
                </a>
              ) : (
                wine.name
              )}
            </h3>

            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: infoMuted }} />
              <span
                className="text-[11px] truncate"
                style={{ color: infoMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                {[wine.vintage, wine.region, wine.country].filter(Boolean).join(' · ')}
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
          ...getReviewPanelStyle(panelTint, mode),
        }}
      >
        {!isLoggedIn ? <LoggedOutLoginPromptOverlay /> : null}

        <div
          className="absolute top-1.5 right-1.5 z-10 flex items-end gap-1.5"
          style={{ pointerEvents: isLoggedIn ? 'auto' : 'none', opacity: isLoggedIn ? 1 : 0.42 }}
        >
          <UsageTipTarget tipId="shortlist-button" className="hidden">
            <PreviewShortlistButton
              wineId={wine.id}
              userId={userId}
              review={review}
              disabled={!isLoggedIn}
              labelColor={panelText.label}
              onReviewChange={onReviewChange}
            />
          </UsageTipTarget>
          <UsageTipTarget tipId="hide-wine">
            <HideButton
              active={isHidden}
              saving={savingHide}
              panelLabelColor={panelText.label}
              onClick={() => void toggleHide()}
            />
          </UsageTipTarget>
        </div>

        <div
          className="flex flex-col gap-1.5 min-h-0"
          style={{
            pointerEvents: isLoggedIn ? 'auto' : 'none',
            opacity: isLoggedIn ? 1 : 0.42,
          }}
        >
          <div className="flex items-end gap-1.5 min-w-0 pr-14">
            <UsageTipTarget tipId="wishlist-button">
              <PreviewWishlistPicker
                wineId={wine.id}
                userId={userId}
                review={review}
                labelColor={panelText.label}
                onReviewChange={onReviewChange}
              />
            </UsageTipTarget>
          </div>

          <div
            style={{
              height: 1,
              background: panelText.notesBorder,
              opacity: 0.5,
            }}
          />

          <div className="flex items-end gap-1.5">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <p
                className="text-[6px] uppercase tracking-wider leading-none"
                style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                Tried it?
              </p>
              <UsageTipTarget tipId="notes-textfield">
                <input
                  type="text"
                  value={notesDraft}
                  disabled={savingNotes}
                  placeholder="Notes"
                  className="w-full text-[11px] focus:outline-none transition-colors rounded-lg px-2 disabled:opacity-60"
                  style={{
                    height: 28,
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
            </div>
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <p
                className="text-[6px] uppercase tracking-wider leading-none text-center"
                style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                Buy again?
              </p>
              <UsageTipTarget tipId="tried-button">
                <PreviewTriedStatusPicker
                  wineId={wine.id}
                  userId={userId}
                  review={review}
                  onReviewChange={onReviewChange}
                />
              </UsageTipTarget>
            </div>
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
