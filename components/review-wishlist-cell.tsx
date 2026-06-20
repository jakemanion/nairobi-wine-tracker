'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { WineReview } from '@/components/wine-table'
import { saveReviewWishlistField, type WishlistValue } from '@/lib/reviews'

type EditableReviewWishlistCellProps = {
  label: string
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

const ICON_SIZE = 28
const PANEL_WIDTH = 300
const PANEL_HEIGHT_WITH_TOOLTIP = 72
const HOVER_CLOSE_DELAY_MS = 120

const inactiveColor = '#bbb'
const wantColor = '#0a7'
const dontWantColor = '#c33'
const silverTreatColor = '#b0b0b0'
const goldTreatColor = '#b8860b'
const nullStarColor = '#d0d0d0'

const rootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  width: '100%',
  height: '100%',
}

const triggerButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 8px',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
}

const panelShellStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 2,
  padding: '8px 10px',
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 8,
  boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
}

const panelOptionColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minWidth: 56,
}

const panelOptionStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 6px',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
}

const tooltipStyle: CSSProperties = {
  fontSize: 10,
  color: '#555',
  textAlign: 'center',
  lineHeight: 1.2,
  maxWidth: 80,
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
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
    tasting_notes: review?.tasting_notes ?? null,
    tasted_on: review?.tasted_on ?? null,
  }
}

function placePanelAtCenter(rect: DOMRect, panelHeight = PANEL_HEIGHT_WITH_TOOLTIP) {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  let left = centerX - PANEL_WIDTH / 2
  let top = centerY - panelHeight / 2

  if (left < 12) left = 12
  if (left + PANEL_WIDTH > window.innerWidth - 12) {
    left = window.innerWidth - PANEL_WIDTH - 12
  }
  if (top < 12) top = 12
  if (top + panelHeight > window.innerHeight - 12) {
    top = window.innerHeight - panelHeight - 12
  }

  return { left, top }
}

function OutlinedStarIcon({ color }: { color: string }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.6 8.6 5.2 12.5 5.6 9.6 8.2 10.5 12 7 10.2 3.5 12 4.4 8.2 1.5 5.6 5.4 5.2Z"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FilledStarIcon({ color }: { color: string }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.6 8.6 5.2 12.5 5.6 9.6 8.2 10.5 12 7 10.2 3.5 12 4.4 8.2 1.5 5.6 5.4 5.2Z"
        fill={color}
        stroke={color}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DollarStarIcon({
  starColor,
  dollarColor,
}: {
  starColor: string
  dollarColor: string
}) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.6 8.6 5.2 12.5 5.6 9.6 8.2 10.5 12 7 10.2 3.5 12 4.4 8.2 1.5 5.6 5.4 5.2Z"
        fill={starColor}
        stroke={starColor}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <text
        x="7"
        y="9.2"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="700"
        fill={dollarColor}
      >
        $
      </text>
    </svg>
  )
}

function renderWishlistIcon(value: WishlistValue, active = true): ReactNode {
  switch (value) {
    case null:
      return <OutlinedStarIcon color={active ? nullStarColor : '#e8e8e8'} />
    case 0:
      return (
        <span
          style={{
            fontSize: ICON_SIZE,
            lineHeight: 1,
            color: active ? dontWantColor : inactiveColor,
            fontWeight: active ? 700 : 400,
          }}
        >
          ✗
        </span>
      )
    case 1:
      return <FilledStarIcon color={active ? wantColor : inactiveColor} />
    case 2:
      return (
        <DollarStarIcon
          starColor={active ? silverTreatColor : inactiveColor}
          dollarColor={active ? '#4a4a4a' : '#888'}
        />
      )
    case 3:
      return (
        <DollarStarIcon
          starColor={active ? goldTreatColor : inactiveColor}
          dollarColor="#fff"
        />
      )
    default:
      return null
  }
}

const WISHLIST_OPTIONS: Array<{
  value: WishlistValue
  ariaLabel: string
  tooltip: string
}> = [
  { value: null, ariaLabel: 'not set', tooltip: 'Not set' },
  { value: 0, ariaLabel: "don't want", tooltip: "Don't want" },
  { value: 1, ariaLabel: 'want', tooltip: 'Want' },
  { value: 2, ariaLabel: 'expensive treat', tooltip: 'Expensive treat' },
  { value: 3, ariaLabel: 'very expensive treat', tooltip: 'Very expensive treat' },
]

function normalizeWishlistValue(value: number | null | undefined): WishlistValue {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return null
}

function wishlistOption(value: number | null | undefined) {
  return WISHLIST_OPTIONS.find((option) => option.value === normalizeWishlistValue(value)) ?? WISHLIST_OPTIONS[0]
}

export function EditableReviewWishlistCell({
  label,
  wineId,
  userId,
  review,
  onReviewChange,
}: EditableReviewWishlistCellProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 })
  const [hoveredOption, setHoveredOption] = useState<WishlistValue | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const value = normalizeWishlistValue(review?.wishlist)
  const currentOption = wishlistOption(value)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current != null) {
        window.clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  function cancelClose() {
    if (closeTimeoutRef.current != null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  function scheduleClose() {
    cancelClose()
    closeTimeoutRef.current = window.setTimeout(() => {
      setPanelOpen(false)
      setHoveredOption(undefined)
      closeTimeoutRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  function openPanel() {
    if (saving) return
    cancelClose()
    if (!panelOpen) {
      const cell = rootRef.current?.closest('td') ?? rootRef.current
      if (cell) {
        setPanelPosition(placePanelAtCenter(cell.getBoundingClientRect()))
      }
    }
    setPanelOpen(true)
  }

  async function setValue(next: WishlistValue) {
    if (saving || value === next) {
      setPanelOpen(false)
      return
    }

    const previousReview = review ?? null
    const optimisticReview = buildOptimisticReview(review, next)

    setSaving(true)
    setError(null)
    onReviewChange(optimisticReview)
    setPanelOpen(false)

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

  return (
    <div ref={rootRef} style={rootStyle}>
      <button
        type="button"
        aria-label={`${label}: ${currentOption.ariaLabel}`}
        aria-haspopup="true"
        aria-expanded={panelOpen}
        disabled={saving}
        style={{
          ...triggerButtonStyle,
          opacity: saving ? 0.5 : 1,
          cursor: saving ? 'wait' : 'pointer',
        }}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
      >
        {renderWishlistIcon(value, true)}
      </button>

      {mounted && panelOpen
        ? createPortal(
            <div
              role="menu"
              aria-label={`${label} options`}
              style={{ ...panelShellStyle, left: panelPosition.left, top: panelPosition.top }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {WISHLIST_OPTIONS.map((option) => {
                const selected = value === option.value
                const hovered = hoveredOption === option.value
                return (
                  <div
                    key={option.ariaLabel}
                    style={panelOptionColumnStyle}
                    onMouseEnter={() => setHoveredOption(option.value)}
                    onMouseLeave={() => setHoveredOption(undefined)}
                  >
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      aria-label={option.ariaLabel}
                      title={option.tooltip}
                      disabled={saving}
                      style={{
                        ...panelOptionStyle,
                        background: selected ? '#f0f4f8' : 'transparent',
                        outline: selected ? '2px solid #c5d4e8' : 'none',
                        cursor: saving ? 'wait' : 'pointer',
                      }}
                      onClick={() => void setValue(option.value)}
                    >
                      {renderWishlistIcon(option.value, true)}
                    </button>
                    {hovered ? (
                      <span style={tooltipStyle}>{option.tooltip}</span>
                    ) : (
                      <span style={{ ...tooltipStyle, visibility: 'hidden' }} aria-hidden>
                        {option.tooltip}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>,
            document.body,
          )
        : null}

      {error && (
        <span style={{ color: '#c33', fontSize: 10, maxWidth: 110, lineHeight: 1.2 }}>
          {error}
        </span>
      )}
    </div>
  )
}
