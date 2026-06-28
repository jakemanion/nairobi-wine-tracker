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
import type { PreviewThemeMode } from '@/lib/preview/preview-colors'
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
        label: 'Expensive treat',
        border: '#585A60',
        bg: '#2E3038',
        color: '#A0A8B8',
        filled: true,
      }
    case 3:
      return {
        icon: Crown,
        label: 'Very expensive treat',
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
  const { colors } = usePreviewTheme()
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
                        border: `2px solid ${optionCfg.border}`,
                        background: selected ? optionCfg.bg : 'transparent',
                        color: optionCfg.color,
                        outline: selected ? `2px solid ${colors.pickerPanelBorder}` : 'none',
                        cursor: saving ? 'wait' : 'pointer',
                      }}
                      onMouseEnter={() => setHoveredOption(option.value)}
                      onClick={() => void setValue(option.value)}
                    >
                      <OptionIcon
                        size={OPTION_ICON_SIZE}
                        className={optionCfg.filled ? 'fill-current' : undefined}
                      />
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

export function getReviewPanelStyle(
  wishlist: WishlistValue,
  mode: PreviewThemeMode = 'dark',
): CSSProperties {
  if (mode === 'light') {
    if (wishlist === 1) {
      return { background: '#C4F0CC', borderLeft: '3px solid #38A050' }
    }
    if (wishlist === 2) {
      return { background: '#D4DAF0', borderLeft: '3px solid #7888B0' }
    }
    if (wishlist === 3) {
      return { background: '#FFE88A', borderLeft: '3px solid #C8A020' }
    }
    return { background: '#F5F3EF', borderLeft: '1px solid #D8D4CC' }
  }

  if (wishlist === 1) {
    return { background: '#1E6A30', borderLeft: '3px solid #48C868' }
  }
  if (wishlist === 2) {
    return {
      background: 'linear-gradient(160deg, #4A5270 0%, #7880A0 48%, #5A6280 100%)',
      borderLeft: '3px solid #A0A8C8',
    }
  }
  if (wishlist === 3) {
    return {
      background: 'linear-gradient(160deg, #8A6810 0%, #D0A828 48%, #A88818 100%)',
      borderLeft: '3px solid #F0D050',
    }
  }
  return { background: '#1C1C24', borderLeft: '1px solid #2E2E3A' }
}
