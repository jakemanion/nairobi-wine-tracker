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
import { saveReviewTriedStatusField, type TriedStatusValue } from '@/lib/reviews'

type EditableReviewTriedStatusCellProps = {
  label: string
  wineId: string
  userId: string
  review?: WineReview | null
  onReviewChange: (review: WineReview | null) => void
}

const CELL_ICON_SIZE = 28
const PANEL_ICON_SIZE = 16
const PANEL_WIDTH = 94
const PANEL_HEIGHT = 52
const HOVER_CLOSE_DELAY_MS = 120

const inactiveColor = '#bbb'
const triedColor = '#555'
const buyAgainColor = '#0a7'
const dontBuyAgainColor = '#c33'
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
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  padding: '4px 6px 3px',
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 6,
  boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
}

const panelIconRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 0,
}

const panelOptionStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '2px 3px',
  cursor: 'pointer',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 3,
}

const panelTooltipStyle: CSSProperties = {
  fontSize: 9,
  color: '#666',
  textAlign: 'center',
  lineHeight: 1.2,
  minHeight: 11,
  width: '100%',
  whiteSpace: 'nowrap',
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
    shortlist: review?.shortlist ?? null,
    want_to_try: review?.want_to_try ?? null,
    tried: review?.tried ?? null,
    would_buy_again: review?.would_buy_again ?? null,
    tasting_notes: review?.tasting_notes ?? null,
    tasted_on: review?.tasted_on ?? null,
  }
}

function placePanelAtCenter(rect: DOMRect, panelHeight = PANEL_HEIGHT) {
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

function OutlinedStarIcon({ color, size = CELL_ICON_SIZE }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
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

function TickIcon({ color, size = CELL_ICON_SIZE }: { color: string; size?: number }) {
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1,
        color,
        fontWeight: 700,
      }}
    >
      ✓
    </span>
  )
}

function CrossIcon({ color, size = CELL_ICON_SIZE }: { color: string; size?: number }) {
  return (
    <span
      style={{
        fontSize: size,
        lineHeight: 1,
        color,
        fontWeight: 700,
      }}
    >
      ✗
    </span>
  )
}

function renderTriedStatusIcon(
  value: TriedStatusValue,
  active = true,
  size = CELL_ICON_SIZE,
): ReactNode {
  switch (value) {
    case null:
      return <OutlinedStarIcon color={active ? nullStarColor : '#e8e8e8'} size={size} />
    case 0:
      return <TickIcon color={active ? triedColor : inactiveColor} size={size} />
    case 1:
      return <TickIcon color={active ? buyAgainColor : inactiveColor} size={size} />
    case 2:
      return <CrossIcon color={active ? dontBuyAgainColor : inactiveColor} size={size} />
    default:
      return null
  }
}

const TRIED_STATUS_OPTIONS: Array<{
  value: TriedStatusValue
  ariaLabel: string
  tooltip: string
}> = [
  { value: null, ariaLabel: 'not set', tooltip: 'Not set' },
  { value: 0, ariaLabel: 'tried', tooltip: 'Tried' },
  { value: 1, ariaLabel: 'tried buy again', tooltip: 'Buy again' },
  { value: 2, ariaLabel: 'tried dont buy again', tooltip: "Don't buy again" },
]

function normalizeTriedStatusValue(value: number | null | undefined): TriedStatusValue {
  if (value === 0 || value === 1 || value === 2) return value
  return null
}

function triedStatusOption(value: number | null | undefined) {
  return (
    TRIED_STATUS_OPTIONS.find((option) => option.value === normalizeTriedStatusValue(value)) ??
    TRIED_STATUS_OPTIONS[0]
  )
}

export function EditableReviewTriedStatusCell({
  label,
  wineId,
  userId,
  review,
  onReviewChange,
}: EditableReviewTriedStatusCellProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 })
  const [hoveredOption, setHoveredOption] = useState<TriedStatusValue | 'none'>('none')
  const [mounted, setMounted] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const value = normalizeTriedStatusValue(review?.tried_status)
  const currentOption = triedStatusOption(value)

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
    if (!panelOpen) {
      const cell = rootRef.current?.closest('td') ?? rootRef.current
      if (cell) {
        setPanelPosition(placePanelAtCenter(cell.getBoundingClientRect()))
      }
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
        {renderTriedStatusIcon(value, true)}
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
              <div style={panelIconRowStyle}>
                {TRIED_STATUS_OPTIONS.map((option) => {
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
                        outline: selected ? '1px solid #c5d4e8' : 'none',
                        cursor: saving ? 'wait' : 'pointer',
                      }}
                      onMouseEnter={() => setHoveredOption(option.value)}
                      onClick={() => void setValue(option.value)}
                    >
                      {renderTriedStatusIcon(option.value, true, PANEL_ICON_SIZE)}
                    </button>
                  )
                })}
              </div>
              <span style={panelTooltipStyle} aria-live="polite">
                {hoveredOption === 'none'
                  ? '\u00a0'
                  : triedStatusOption(hoveredOption).tooltip}
              </span>
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
