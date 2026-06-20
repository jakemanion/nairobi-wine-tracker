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
const PANEL_WIDTH = 220
const PANEL_HEIGHT = 56
const HOVER_CLOSE_DELAY_MS = 120

const inactiveColor = '#bbb'
const wantColor = '#0a7'
const dontWantColor = '#c33'
const treatColor = '#b8860b'
const nullActiveColor = '#888'
const nullInactiveColor = '#ddd'

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
  alignItems: 'center',
  gap: 4,
  padding: '8px 10px',
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 8,
  boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
}

const panelOptionStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '6px 8px',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
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

function placePanelAtCenter(rect: DOMRect) {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  let left = centerX - PANEL_WIDTH / 2
  let top = centerY - PANEL_HEIGHT / 2

  if (left < 12) left = 12
  if (left + PANEL_WIDTH > window.innerWidth - 12) {
    left = window.innerWidth - PANEL_WIDTH - 12
  }
  if (top < 12) top = 12
  if (top + PANEL_HEIGHT > window.innerHeight - 12) {
    top = window.innerHeight - PANEL_HEIGHT - 12
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

function TreatStarIcon({ color }: { color: string }) {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 14 14" aria-hidden>
      <path
        d="M7 1.6 8.6 5.2 12.5 5.6 9.6 8.2 10.5 12 7 10.2 3.5 12 4.4 8.2 1.5 5.6 5.4 5.2Z"
        fill={color}
        stroke={color}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <text
        x="7"
        y="9.2"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="700"
        fill="#fff"
      >
        $
      </text>
    </svg>
  )
}

const WISHLIST_OPTIONS: Array<{
  value: WishlistValue
  ariaLabel: string
  render: (selected: boolean) => ReactNode
}> = [
  {
    value: null,
    ariaLabel: 'not set',
    render: (selected) => (
      <OutlinedStarIcon color={selected ? nullActiveColor : nullInactiveColor} />
    ),
  },
  {
    value: 0,
    ariaLabel: "don't want",
    render: (selected) => (
      <span
        style={{
          fontSize: ICON_SIZE,
          lineHeight: 1,
          color: selected ? dontWantColor : inactiveColor,
          fontWeight: selected ? 700 : 400,
        }}
      >
        ✗
      </span>
    ),
  },
  {
    value: 1,
    ariaLabel: 'want',
    render: (selected) => <FilledStarIcon color={selected ? wantColor : inactiveColor} />,
  },
  {
    value: 2,
    ariaLabel: 'want as an expensive treat',
    render: (selected) => <TreatStarIcon color={selected ? treatColor : inactiveColor} />,
  },
]

function normalizeWishlistValue(value: number | null | undefined): WishlistValue {
  if (value === 0 || value === 1 || value === 2) return value
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
        {currentOption.render(true)}
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
                return (
                  <button
                    key={option.ariaLabel}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    aria-label={option.ariaLabel}
                    disabled={saving}
                    style={{
                      ...panelOptionStyle,
                      background: selected ? '#f0f4f8' : 'transparent',
                      cursor: saving ? 'wait' : 'pointer',
                    }}
                    onClick={() => void setValue(option.value)}
                  >
                    {option.render(selected)}
                  </button>
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
