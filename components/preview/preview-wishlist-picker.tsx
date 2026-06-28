'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Bookmark, BookmarkCheck, Crown, Star, X } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { saveReviewWishlistField, type WishlistValue } from '@/lib/reviews'

const PANEL_WIDTH = 200
const PANEL_HEIGHT = 56
const HOVER_CLOSE_DELAY_MS = 120

type PreviewWishlistPickerProps = {
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

const WISHLIST_OPTIONS: Array<{
  value: WishlistValue
  label: string
  tooltip: string
}> = [
  { value: null, label: 'Not set', tooltip: 'Not set' },
  { value: 0, label: "Don't want", tooltip: "Don't want" },
  { value: 1, label: 'Want', tooltip: 'Wishlist' },
  { value: 2, label: 'Expensive treat', tooltip: '$ Treat' },
  { value: 3, label: 'Very expensive treat', tooltip: '$$ Treat' },
]

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return null
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

function buttonConfig(value: WishlistValue) {
  switch (value) {
    case 0:
      return {
        icon: X,
        label: "Don't want",
        border: '#5A3030',
        bg: '#2A1C1C',
        color: '#A05050',
        filled: false,
      }
    case 1:
      return {
        icon: Bookmark,
        label: 'Wishlist',
        border: '#2A5030',
        bg: '#162010',
        color: '#50A060',
        filled: true,
      }
    case 2:
      return {
        icon: BookmarkCheck,
        label: '$ Treat',
        border: '#585A60',
        bg: '#2E3038',
        color: '#A0A8B8',
        filled: true,
      }
    case 3:
      return {
        icon: Crown,
        label: '$$ Treat',
        border: '#7A6820',
        bg: '#2A2208',
        color: '#C8A830',
        filled: true,
      }
    default:
      return {
        icon: Star,
        label: 'Not set',
        border: '#3A3848',
        bg: '#22222C',
        color: '#54505E',
        filled: false,
      }
  }
}

const panelShellStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: '6px 8px 5px',
  background: '#1A1A22',
  border: '1px solid #3A3848',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
}

const panelOptionStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '3px 4px',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
}

export function PreviewWishlistPicker({
  wineId,
  userId,
  review,
  onReviewChange,
}: PreviewWishlistPickerProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 })
  const [hoveredOption, setHoveredOption] = useState<WishlistValue | 'none'>('none')
  const [mounted, setMounted] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const value = normalizeWishlist(review?.wishlist)
  const cfg = buttonConfig(value)
  const TriggerIcon = cfg.icon

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
      setHoveredOption('none')
      closeTimeoutRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  function openPanel() {
    if (saving) return
    cancelClose()
    if (!panelOpen && buttonRef.current) {
      setPanelPosition(placePanelAtCenter(buttonRef.current.getBoundingClientRect()))
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

  const tooltip =
    hoveredOption === 'none'
      ? '\u00a0'
      : (WISHLIST_OPTIONS.find((o) => o.value === hoveredOption)?.tooltip ?? '')

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        title={cfg.label}
        aria-label={`Wishlist: ${cfg.label}`}
        aria-haspopup="true"
        aria-expanded={panelOpen}
        disabled={saving}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
        style={{
          border: `2px solid ${cfg.border}`,
          background: cfg.bg,
          color: cfg.color,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          opacity: saving ? 0.5 : 1,
          cursor: saving ? 'wait' : 'pointer',
        }}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
      >
        <TriggerIcon className={`w-5 h-5 ${cfg.filled ? 'fill-current' : ''}`} />
      </button>

      {mounted && panelOpen
        ? createPortal(
            <div
              role="menu"
              aria-label="Wishlist options"
              style={{ ...panelShellStyle, left: panelPosition.left, top: panelPosition.top, width: PANEL_WIDTH }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="flex items-center justify-center gap-0.5 w-full">
                {WISHLIST_OPTIONS.map((option) => {
                  const selected = value === option.value
                  const optionCfg = buttonConfig(option.value)
                  const OptionIcon = optionCfg.icon
                  return (
                    <button
                      key={option.label}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      aria-label={option.label}
                      disabled={saving}
                      style={{
                        ...panelOptionStyle,
                        background: selected ? '#2A2A36' : 'transparent',
                        outline: selected ? '1px solid #4A4A58' : 'none',
                        color: optionCfg.color,
                        cursor: saving ? 'wait' : 'pointer',
                      }}
                      onMouseEnter={() => setHoveredOption(option.value)}
                      onClick={() => void setValue(option.value)}
                    >
                      <OptionIcon
                        className={`w-4 h-4 ${optionCfg.filled ? 'fill-current' : ''}`}
                      />
                    </button>
                  )
                })}
              </div>
              <span
                className="text-[9px] text-center w-full"
                style={{ color: '#7A7888', minHeight: 11, lineHeight: 1.2 }}
                aria-live="polite"
              >
                {tooltip}
              </span>
            </div>,
            document.body,
          )
        : null}

      {error ? (
        <span className="text-[9px] text-center" style={{ color: '#c05050', maxWidth: 72, lineHeight: 1.2 }}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

export function getReviewPanelStyle(wishlist: WishlistValue): CSSProperties {
  if (wishlist === 1) {
    return { background: '#142010', borderLeft: '1px solid #2A4828' }
  }
  if (wishlist === 2) {
    return {
      background:
        'linear-gradient(160deg, #28292E 0%, #3E4048 40%, #2C2D34 70%, #28292E 100%)',
      borderLeft: '1px solid #56585E',
    }
  }
  if (wishlist === 3) {
    return {
      background:
        'linear-gradient(160deg, #1E1A0A 0%, #4A3C10 40%, #382E0C 70%, #1E1A0A 100%)',
      borderLeft: '1px solid #6A5C20',
    }
  }
  return { background: '#1C1C24', borderLeft: '1px solid #2E2E3A' }
}
