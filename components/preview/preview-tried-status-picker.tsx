'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Star, X } from 'lucide-react'
import type { WineReview } from '@/components/wine-table'
import { saveReviewTriedStatusField, type TriedStatusValue } from '@/lib/reviews'

const PANEL_WIDTH = 176
const PANEL_HEIGHT = 56
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
  { value: null, label: 'Not set', tooltip: 'Not set' },
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

function buttonConfig(value: TriedStatusValue) {
  switch (value) {
    case 0:
      return {
        icon: Check,
        label: 'Tried',
        border: '#4A4A58',
        bg: '#2A2A34',
        color: '#9A98A8',
        filled: false,
      }
    case 1:
      return {
        icon: Check,
        label: 'Buy again',
        border: '#2A5030',
        bg: '#162010',
        color: '#50A060',
        filled: false,
      }
    case 2:
      return {
        icon: X,
        label: "Don't buy again",
        border: '#5A3030',
        bg: '#2A1C1C',
        color: '#A05050',
        filled: false,
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

export function PreviewTriedStatusPicker({
  wineId,
  userId,
  review,
  onReviewChange,
}: PreviewTriedStatusPickerProps) {
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
        <TriggerIcon className="w-5 h-5" strokeWidth={value === 1 ? 2.5 : 2} />
      </button>

      {mounted && panelOpen
        ? createPortal(
            <div
              role="menu"
              aria-label="Tried status options"
              style={{ ...panelShellStyle, left: panelPosition.left, top: panelPosition.top, width: PANEL_WIDTH }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="flex items-center justify-center gap-0.5 w-full">
                {TRIED_OPTIONS.map((option) => {
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
                      <OptionIcon className="w-4 h-4" strokeWidth={option.value === 1 ? 2.5 : 2} />
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
