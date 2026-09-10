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
  getTrialReviewControlStyle,
  PreviewWishlistPicker,
  TRIAL_REVIEW_BUTTON_RADIUS,
} from '@/components/preview/preview-wishlist-picker'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { PreviewShortlistButton } from '@/components/preview/preview-shortlist-button'
import { PreviewTriedStatusPicker } from '@/components/preview/preview-tried-status-picker'
import { ReviewOnTick } from '@/components/preview/review-on-tick'
import { UsageTipTarget } from '@/components/preview/usage-tip-target'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  styleRibbonStyle,
  lowestPrice,
  type PreviewWineCardData,
} from '@/lib/preview/wine-card-model'
import {
  getReviewPanelTextColors,
  type PanelTint,
  type PreviewColors,
  type PreviewVisualStyle,
} from '@/lib/preview/preview-colors'
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

const STAR_SLOT_SIZE = 9
const EMPTY_STAR_COLOR = '#D2D2DC'
const RATING_CIRCLE_SIZE = 30

type RatingCircleStyle = {
  background: string
  border: string
  boxShadow: string
  textColor: string
  fillColor: string
}

function ratingTierColor(stars: number | null): string {
  if (stars == null) return '#D2D2DC'
  if (stars >= 5) return '#6DB86A'
  if (stars >= 4) return '#A8B85C'
  if (stars >= 3) return '#D4C05A'
  if (stars >= 2) return '#D49858'
  return '#D66A6A'
}

function ratingCircleStyle(stars: number | null): RatingCircleStyle {
  const fillColor = ratingTierColor(stars)
  const textColor = '#1A1814'

  return {
    background: fillColor,
    border: '2px solid #FFFFFF',
    boxShadow: '0 1px 3px rgba(26, 24, 20, 0.18)',
    textColor,
    fillColor,
  }
}

function starFillAmount(rating: number, index: number): number {
  const remainder = rating - index
  if (remainder >= 1) return 1
  if (remainder <= 0) return 0
  return Math.round(remainder * 4) / 4
}

function FractionalStar({
  fill,
  filledColor,
}: {
  fill: number
  filledColor: string
}) {
  const clamped = Math.min(1, Math.max(0, fill))

  return (
    <span
      className="relative inline-block flex-shrink-0"
      style={{ width: STAR_SLOT_SIZE, height: STAR_SLOT_SIZE }}
      aria-hidden
    >
      <Star
        size={STAR_SLOT_SIZE}
        strokeWidth={1.2}
        className="absolute inset-0"
        style={{ color: EMPTY_STAR_COLOR, fill: 'none' }}
      />
      {clamped > 0 ? (
        <span
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${clamped * 100}%` }}
        >
          <Star
            size={STAR_SLOT_SIZE}
            strokeWidth={0}
            style={{ color: filledColor, fill: filledColor }}
          />
        </span>
      ) : null}
    </span>
  )
}

function WineStarRating({
  vivinoRating,
  vivinoUrl,
  mutedColor,
}: {
  vivinoRating: number | null
  vivinoUrl: string | null
  mutedColor: string
}) {
  const starRating = vivinoToStarRating(vivinoRating)
  const hasVivino = vivinoRating != null
  const vivinoLabel = hasVivino ? `${vivinoRating.toFixed(1)} on Vivino` : 'Vivino'
  const ratingLabel = starRating != null ? formatStarRating(starRating) : '–'
  const circle = ratingCircleStyle(starRating)

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
    <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
      <div
        className="flex flex-col items-center"
        title={starRating != null ? `${ratingLabel} stars` : 'No rating'}
        role="img"
        aria-label={starRating != null ? `Rated ${ratingLabel} out of 5 stars` : 'No rating'}
      >
        <div
          className="relative z-10 flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: RATING_CIRCLE_SIZE,
            height: RATING_CIRCLE_SIZE,
            background: circle.background,
            border: circle.border,
            boxShadow: circle.boxShadow,
            marginBottom: -8,
          }}
          aria-hidden={starRating == null}
        >
          <Star
            size={22}
            strokeWidth={0}
            className="absolute"
            style={{ color: '#FFFFFF', fill: '#FFFFFF', opacity: 0.33 }}
            aria-hidden
          />
          <span
            className="relative tabular-nums font-bold leading-none"
            style={{
              color: circle.textColor,
              fontFamily: 'var(--font-dm-sans), sans-serif',
              fontSize: ratingLabel.length > 3 ? 9 : ratingLabel.length > 2 ? 10 : 12,
              letterSpacing: '-0.03em',
            }}
          >
            {ratingLabel}
          </span>
        </div>
        <div
          className="flex items-center gap-px px-1.5"
          style={{
            height: 16,
            background: '#FFFFFF',
            border: '1px solid #E8E8F0',
            borderRadius: 5,
            boxShadow: '0 1px 2px rgba(26, 24, 20, 0.06)',
          }}
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <FractionalStar
              key={index}
              fill={starRating != null ? starFillAmount(starRating, index) : 0}
              filledColor={circle.fillColor}
            />
          ))}
        </div>
      </div>

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

function CardStatusLabel({
  text,
  background,
  color,
}: {
  text: string
  background: string
  color: string
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        background,
        color,
        borderRadius: '6px 0 0 6px',
        padding: '8px 5px',
        boxShadow: '0 1px 4px rgba(26, 24, 20, 0.16)',
      }}
    >
      <span
        className="text-[9px] font-bold uppercase leading-none whitespace-nowrap"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          letterSpacing: '0.14em',
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        {text}
      </span>
    </div>
  )
}

function HideButton({
  active,
  saving,
  panelLabelColor,
  panelTint,
  colors,
  visualStyle,
  onClick,
}: {
  active: boolean
  saving: boolean
  panelLabelColor: string
  panelTint: PanelTint
  colors: PreviewColors
  visualStyle: PreviewVisualStyle
  onClick: () => void
}) {
  const trial = visualStyle === 'trial'
  const trialStyle = trial ? getTrialReviewControlStyle(panelTint, 'hide', active) : null
  const unmarkedEyeIcon = '#C8AAAA'
  const borderColor = trialStyle ? trialStyle.border : active ? '#5A3030' : colors.controlIdleBorder
  const bgColor = trialStyle ? trialStyle.bg : active ? '#2A1C1C' : colors.controlIdleBg
  const iconColor =
    panelTint === 'none'
      ? unmarkedEyeIcon
      : active
        ? trialStyle
          ? trialStyle.icon
          : '#F08080'
        : trialStyle
          ? trialStyle.icon
          : colors.controlIdleIcon
  const iconFilled = trialStyle ? trialStyle.filled : false

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0 m-0 p-0">
      <p
        className="m-0 p-0 text-[8px] uppercase tracking-wider leading-none text-center whitespace-nowrap"
        style={{ color: panelLabelColor, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        IGNORE
      </p>
      <InstantTooltip label={active ? 'Show wine again' : 'Hide this wine'}>
        <button
          type="button"
          aria-label={active ? 'Show wine again' : 'Hide this wine'}
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
          onClick={onClick}
        >
          <EyeOff
            size={24}
            strokeWidth={2}
            fill={iconFilled ? 'currentColor' : 'none'}
            className={iconFilled ? 'fill-current' : undefined}
            style={{ color: iconColor }}
          />
          {active ? <ReviewOnTick colors={colors} accentColor={iconColor} /> : null}
        </button>
      </InstantTooltip>
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
  const { colors, mode, visualStyle } = usePreviewTheme()
  const wishlist = normalizeWishlist(review?.wishlist)
  const triedStatus = normalizeTriedStatus(review?.tried_status)
  const shortlisted = review?.shortlist === 1
  const isHidden = review?.hide === true
  const isDimmed = triedStatus === 2 || isHidden
  const minPrice = lowestPrice(wine.prices)
  const nameHref = wineNameHref(wine)
  const ribbon = styleRibbonStyle(wine.style)
  const panelTint = getReviewPanelTint(shortlisted, triedStatus === 1, wishlist === 1, visualStyle)
  const panelText = getReviewPanelTextColors(mode, panelTint, visualStyle)
  const cardBorderColor = getCardBorderColor(panelTint, mode, visualStyle)
  const cardBorderStyle =
    visualStyle === 'trial'
      ? {
          border: `1px solid ${cardBorderColor ?? colors.cardBorder}`,
          ...(cardBorderColor ? { borderLeft: `3px solid ${cardBorderColor}` } : {}),
        }
      : {
          border: cardBorderColor
            ? `3px solid ${cardBorderColor}`
            : `1px solid ${colors.cardBorder}`,
        }
  const infoOnDark = colors.infoOnDark
  const infoProducer = colors.producer
  const infoWineName = infoOnDark ? '#F5F2EC' : colors.wineName
  const infoMuted = infoOnDark ? '#C8C4D0' : visualStyle === 'trial' ? '#BCBCCE' : colors.muted
  const bookmarkBorder = getCardBorderColor('wishlist', mode, visualStyle)
  const buyAgainBorder = getCardBorderColor('thumbsUp', mode, visualStyle)
  const statusLabels =
    triedStatus === 1 && buyAgainBorder
      ? [{ key: 'buy-again', text: 'Buy again', background: buyAgainBorder, color: '#3A2808' }]
      : wishlist === 1 && bookmarkBorder
        ? [{ key: 'bookmarked', text: 'Bookmarked', background: bookmarkBorder, color: '#FFFFFF' }]
        : []
  const infoGrapeBg = infoOnDark ? 'rgba(255,255,255,0.08)' : colors.grapeBg
  const infoGrapeBorder = infoOnDark ? 'rgba(255,255,255,0.12)' : colors.grapeBorder
  const infoGrapeText = infoOnDark ? '#E8E4DC' : colors.grapeText
  const priceAmountColor = colors.priceAmount

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
    <div className="relative transition-opacity duration-300" style={{ opacity: isDimmed ? 0.4 : 1 }}>
      {statusLabels.length > 0 ? (
        <div
          className="absolute top-1/2 z-20 flex flex-col gap-1 pointer-events-none"
          style={{ left: 0, transform: 'translate(calc(-100% + 3px), -50%)' }}
        >
          {statusLabels.map((label) => (
            <CardStatusLabel
              key={label.key}
              text={label.text}
              background={label.background}
              color={label.color}
            />
          ))}
        </div>
      ) : null}

    <div
      className="relative flex items-stretch overflow-hidden"
      style={{
        background: colors.cardBg,
        ...cardBorderStyle,
        borderRadius: colors.cardRadius,
        boxShadow: isDimmed ? 'none' : colors.cardShadow,
      }}
    >
      {ribbon ? (
        <div
          className="absolute top-0 left-0 z-10 pointer-events-none"
          style={{
            background: ribbon.background,
            color: ribbon.color,
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
      ) : null}

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
        className="flex-1 min-w-0 pl-0 pr-3.5 py-2.5 flex flex-col justify-between gap-1.5 relative"
        style={{
          background: colors.wineInfoBg,
          boxShadow: colors.wineInfoSheen,
          borderRight: visualStyle === 'trial' ? undefined : `1px solid ${colors.infoBorder}`,
        }}
      >
        <div className="flex items-start gap-2.5 pr-2">
          <WineStarRating
            vivinoRating={wine.vivinoRating}
            vivinoUrl={wine.vivinoUrl}
            mutedColor={infoMuted}
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
              style={{ color: infoWineName, fontFamily: colors.headingFont }}
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
                          color:
                            isLowest && visualStyle === 'trial'
                              ? colors.priceLow
                              : priceAmountColor,
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
                        className="text-[11px] no-underline hover:underline underline-offset-2"
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
        className="relative flex-shrink-0 px-2.5 pt-1.5 pb-2.5 flex flex-col gap-1.5 transition-colors duration-300 min-w-0 group/review-panel"
        style={{
          width: '35.2%',
          ...getReviewPanelStyle(panelTint, mode, visualStyle),
        }}
      >
        {!isLoggedIn ? <LoggedOutLoginPromptOverlay /> : null}

        <div
          className="flex flex-col gap-1.5 min-h-0"
          style={{
            pointerEvents: isLoggedIn ? 'auto' : 'none',
            opacity: isLoggedIn ? 1 : 0.42,
          }}
        >
          <div className="flex items-start justify-between min-w-0 m-0 p-0">
            <div className="flex items-start gap-1.5 min-w-0 m-0 p-0">
              <UsageTipTarget tipId="wishlist-button">
                <PreviewWishlistPicker
                  wineId={wine.id}
                  userId={userId}
                  review={review}
                  labelColor={panelText.label}
                  panelTint={panelTint}
                  onReviewChange={onReviewChange}
                />
              </UsageTipTarget>
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
            </div>

            <UsageTipTarget tipId="hide-wine">
              <HideButton
                active={isHidden}
                saving={savingHide}
                panelLabelColor={panelText.label}
                panelTint={panelTint}
                colors={colors}
                visualStyle={visualStyle}
                onClick={() => void toggleHide()}
              />
            </UsageTipTarget>
          </div>

          <div
            style={{
              height: 1,
              background:
                visualStyle === 'trial'
                  ? getTrialReviewControlStyle(panelTint, 'bookmark', false).border
                  : colors.controlIdleBorder,
              opacity: 0.5,
            }}
          />

          <p
            className="text-[8px] font-semibold uppercase tracking-wider leading-none text-center px-1"
            style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Have you tried this wine?
          </p>

          <div className="flex items-end gap-1.5">
            <div className="flex-1 min-w-0">
              <UsageTipTarget tipId="notes-textfield">
                <input
                  type="text"
                  value={notesDraft}
                  disabled={savingNotes}
                  placeholder="Your notes..."
                  className="w-full text-[11px] focus:outline-none transition-colors px-2 disabled:opacity-60"
                  style={{
                    height: 28,
                    background: panelText.notesBg,
                    border: `1px solid ${panelText.notesBorder}`,
                    color: panelText.notesText,
                    borderRadius: colors.panelRadius,
                    fontFamily: 'var(--font-dm-sans), sans-serif',
                    caretColor: colors.accent,
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
                className="text-[8px] uppercase tracking-wider leading-none text-center"
                style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                Buy again?
              </p>
              <UsageTipTarget tipId="tried-button">
                <PreviewTriedStatusPicker
                  wineId={wine.id}
                  userId={userId}
                  review={review}
                  panelTint={panelTint}
                  onReviewChange={onReviewChange}
                />
              </UsageTipTarget>
            </div>
          </div>

          {error ? (
            <p className="text-[10px]" style={{ color: colors.errorText }}>
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
    </div>
  )
}
