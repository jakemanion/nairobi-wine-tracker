'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Bookmark, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { WineReview } from '@/components/wine-table'
import { saveReviewWishlistField, type WishlistValue } from '@/lib/reviews'
import type { PreviewThemeMode } from '@/lib/preview/preview-colors'
import { getReviewPanelTextColors } from '@/lib/preview/preview-colors'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'

const PANEL_WIDTH = 248
const PANEL_HEIGHT = 88
const OPTION_SIZE = 40
const OPTION_ICON_SIZE = 20
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
  { value: 2, label: 'Expensive treat', tooltip: 'Expensive treat' },
  { value: 3, label: 'Very expensive treat', tooltip: 'Very expensive treat' },
]

function normalizeWishlist(value: number | null | undefined): WishlistValue {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return null
}

export function getWishlistStateLabel(value: WishlistValue): string {
  switch (value) {
    case 0:
      return 'SKIP'
    case 1:
      return 'WISHLISTED'
    case 2:
      return 'TREAT'
    case 3:
      return 'SPLURGE'
    default:
      return 'WISHLIST'
  }
}

type WishlistButtonConfig = {
  label: string
  border: string
  bg: string
  color: string
  renderIcon: (size: number) => ReactNode
}

function wishlistIcon(value: WishlistValue, size: number, color: string): ReactNode {
  switch (value) {
    case 0:
      return (
        <span className="relative inline-flex items-center justify-center" style={{ color }}>
          <Bookmark size={size} strokeWidth={2} />
          <X
            size={Math.round(size * 0.72)}
            strokeWidth={2.5}
            className="absolute"
            style={{ transform: 'rotate(-14deg)' }}
          />
        </span>
      )
    case 1:
      return <Bookmark size={size} strokeWidth={2} className="fill-current" style={{ color }} />
    case 2:
      return <Bookmark size={size} strokeWidth={2} className="fill-current" style={{ color: '#B8C0D8' }} />
    case 3:
      return <Bookmark size={size} strokeWidth={2} className="fill-current" style={{ color: '#E8C840' }} />
    default:
      return <Bookmark size={size} strokeWidth={2} style={{ color }} />
  }
}

function buttonConfig(value: WishlistValue): WishlistButtonConfig {
  switch (value) {
    case 0:
      return {
        label: "Don't want",
        border: '#5A3030',
        bg: '#2A1C1C',
        color: '#A05050',
        renderIcon: (size) => wishlistIcon(0, size, '#A05050'),
      }
    case 1:
      return {
        label: 'Wishlist',
        border: '#2A5030',
        bg: '#162010',
        color: '#50A060',
        renderIcon: (size) => wishlistIcon(1, size, '#50A060'),
      }
    case 2:
      return {
        label: 'Expensive treat',
        border: '#A0A8C0',
        bg: 'linear-gradient(145deg, #3A3E48 0%, #78808C 52%, #4A4E58 100%)',
        color: '#E8ECF8',
        renderIcon: (size) => wishlistIcon(2, size, '#E8ECF8'),
      }
    case 3:
      return {
        label: 'Very expensive treat',
        border: '#E0C848',
        bg: 'linear-gradient(145deg, #5A4808 0%, #C8A020 52%, #8A7010 100%)',
        color: '#FFF0A0',
        renderIcon: (size) => wishlistIcon(3, size, '#FFF0A0'),
      }
    default:
      return {
        label: 'Not set',
        border: '#3A3848',
        bg: '#22222C',
        color: '#9894A4',
        renderIcon: (size) => wishlistIcon(null, size, '#9894A4'),
      }
  }
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

const panelShellStyle = (colors: { pickerPanelBg: string; pickerPanelBorder: string }): CSSProperties => ({
  position: 'fixed',
  zIndex: 10000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '8px 10px 10px',
  background: colors.pickerPanelBg,
  border: `1px solid ${colors.pickerPanelBorder}`,
  borderRadius: 10,
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
})

const panelOptionStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  width: OPTION_SIZE,
  height: OPTION_SIZE,
}

export function PreviewWishlistPicker({
  wineId,
  userId,
  review,
  onReviewChange,
}: PreviewWishlistPickerProps) {
  const { colors, mode } = usePreviewTheme()
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
  const panelText = getReviewPanelTextColors(mode, value)

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

  function closePanel() {
    cancelClose()
    setPanelOpen(false)
    setHoveredOption('none')
  }

  function scheduleClose() {
    cancelClose()
    closeTimeoutRef.current = window.setTimeout(() => {
      closePanel()
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
      <p
        className="text-[8px] uppercase tracking-wider leading-tight text-center max-w-[54px]"
        style={{ color: panelText.label, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {getWishlistStateLabel(value)}
      </p>
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
        {cfg.renderIcon(20)}
      </button>

      {mounted && panelOpen
        ? createPortal(
            <div
              role="menu"
              aria-label="Wishlist options"
              style={{
                ...panelShellStyle(colors),
                left: panelPosition.left,
                top: panelPosition.top,
                width: PANEL_WIDTH,
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={closePanel}
            >
              <span
                className="text-[11px] font-medium text-center w-full"
                style={{ color: colors.pickerLabel, minHeight: 14, lineHeight: 1.2 }}
                aria-live="polite"
              >
                {tooltip}
              </span>
              <div className="flex items-center justify-center gap-1 w-full">
                {WISHLIST_OPTIONS.map((option) => {
                  const selected = value === option.value
                  const optionCfg = buttonConfig(option.value)
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
                        border: `2px solid ${optionCfg.border}`,
                        background: selected ? optionCfg.bg : 'transparent',
                        color: optionCfg.color,
                        outline: selected ? `2px solid ${colors.pickerPanelBorder}` : 'none',
                        cursor: saving ? 'wait' : 'pointer',
                      }}
                      onMouseEnter={() => setHoveredOption(option.value)}
                      onClick={() => void setValue(option.value)}
                    >
                      {optionCfg.renderIcon(OPTION_ICON_SIZE)}
                    </button>
                  )
                })}
              </div>
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

export function getWishlistAccentColor(
  wishlist: WishlistValue,
  mode: PreviewThemeMode = 'dark',
): string {
  if (mode === 'light') {
    if (wishlist === 1) return '#38A050'
    if (wishlist === 2) return '#7888B0'
    if (wishlist === 3) return '#C8A020'
    if (wishlist === 0) return '#C05050'
    return '#D8D4CC'
  }

  if (wishlist === 1) return '#48C868'
  if (wishlist === 2) return '#A0A8C8'
  if (wishlist === 3) return '#F0D050'
  if (wishlist === 0) return '#C06060'
  return '#3A3848'
}

export function getReviewPanelStyle(
  wishlist: WishlistValue,
  mode: PreviewThemeMode = 'dark',
): CSSProperties {
  if (mode === 'light') {
    if (wishlist === 1) {
      return { background: '#C4F0CC' }
    }
    if (wishlist === 2) {
      return { background: '#D4DAF0' }
    }
    if (wishlist === 3) {
      return { background: '#FFE88A' }
    }
    return { background: '#F5F3EF' }
  }

  if (wishlist === 1) {
    return { background: '#1E6A30' }
  }
  if (wishlist === 2) {
    return {
      background: 'linear-gradient(160deg, #4A5270 0%, #7880A0 48%, #5A6280 100%)',
    }
  }
  if (wishlist === 3) {
    return {
      background: 'linear-gradient(160deg, #8A6810 0%, #D0A828 48%, #A88818 100%)',
    }
  }
  return { background: '#1C1C24' }
}
