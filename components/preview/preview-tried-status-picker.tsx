'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, X, type LucideIcon } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import { saveReviewTriedStatusField, type TriedStatusValue } from '@/lib/reviews'

const PANEL_WIDTH = 208
const PANEL_HEIGHT = 88
const OPTION_SIZE = 40
const OPTION_ICON_SIZE = 20
const HOVER_CLOSE_DELAY_MS = 120

type PreviewTriedStatusPickerProps = {
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

const TRIED_OPTIONS: Array<{
  value: TriedStatusValue
  label: string
  tooltip: string
}> = [
  { value: null, label: 'Not tried', tooltip: 'Not tried' },
  { value: 0, label: 'Tried', tooltip: 'Tried' },
  { value: 1, label: 'Buy again', tooltip: 'Buy again' },
  { value: 2, label: "Don't buy again", tooltip: "Don't buy again" },
]

function normalizeTriedStatus(value: number | null | undefined): TriedStatusValue {
  if (value === 0 || value === 1 || value === 2) return value
  return null
}

function buildOptimisticReview(
  review: WineReview | null | undefined,
  tried_status: TriedStatusValue,
): WineReview {
  return {
    id: review?.id ?? 'pending',
    overall_score: review?.overall_score ?? null,
    value_score: review?.value_score ?? null,
    wishlist: review?.wishlist ?? null,
    tried_status,
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

type TriedButtonConfig = {
  label: string
  border: string
  bg: string
  color: string
  strokeWidth?: number
  textLabel?: string
  icon?: LucideIcon
}

function buttonConfig(value: TriedStatusValue): TriedButtonConfig {
  switch (value) {
    case 0:
      return {
        icon: Check,
        label: 'Tried',
        border: '#6A6878',
        bg: '#3A3848',
        color: '#E8E4DC',
        strokeWidth: 2,
      }
    case 1:
      return {
        icon: Check,
        label: 'Buy again',
        border: '#2A5030',
        bg: '#162010',
        color: '#70D080',
        strokeWidth: 2.5,
      }
    case 2:
      return {
        icon: X,
        label: "Don't buy again",
        border: '#5A3030',
        bg: '#2A1C1C',
        color: '#F08080',
        strokeWidth: 2,
      }
    default:
      return {
        label: 'Not tried',
        textLabel: 'Not tried',
        border: '#5A5868',
        bg: '#2A2A34',
        color: '#E8E4DC',
      }
  }
}

function TriedButtonContent({ config }: { config: TriedButtonConfig }) {
  if (config.textLabel) {
    return (
      <span
        style={{
          fontSize: 7,
          lineHeight: 1.05,
          fontWeight: 600,
          textAlign: 'center',
          padding: '0 3px',
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        {config.textLabel}
      </span>
    )
  }

  const Icon = config.icon!
  return <Icon size={OPTION_ICON_SIZE} strokeWidth={config.strokeWidth ?? 2} />
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

export function PreviewTriedStatusPicker({
  wineId,
  userId,
  review,
  onReviewChange,
}: PreviewTriedStatusPickerProps) {
  const { colors } = usePreviewTheme()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 })
  const [hoveredOption, setHoveredOption] = useState<TriedStatusValue | 'none'>('none')
  const [mounted, setMounted] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const value = normalizeTriedStatus(review?.tried_status)
  const cfg = buttonConfig(value)

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

  async function setValue(next: TriedStatusValue) {
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

    const result = await saveReviewTriedStatusField({
      userId,
      wineId,
      reviewId: review?.id,
      value: next,
    })

    setSaving(false)

    if (result.error || !result.review) {
      onReviewChange(previousReview)
      setError(result.error ?? 'Failed to save tried status.')
      return
    }

    onReviewChange(result.review)
  }

  const tooltip =
    hoveredOption === 'none'
      ? '\u00a0'
      : (TRIED_OPTIONS.find((o) => o.value === hoveredOption)?.tooltip ?? '')

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        title={cfg.label}
        aria-label={`Tried: ${cfg.label}`}
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
        <TriedButtonContent config={cfg} />
      </button>

      {mounted && panelOpen
        ? createPortal(
            <div
              role="menu"
              aria-label="Tried status options"
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
                {TRIED_OPTIONS.map((option) => {
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
                      <TriedButtonContent config={optionCfg} />
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
