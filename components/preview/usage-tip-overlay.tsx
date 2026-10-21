'use client'

import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Lightbulb } from 'lucide-react'
import type { CSSProperties } from 'react'
import { BRAND_GREEN } from '@/lib/preview/preview-colors'

export type UsageTipPlacement = 'bottom-left-of-cursor' | 'above-anchor'

export type UsageTipPoint = {
  x: number
  y: number
}

const TIP_WIDTH = 220
const VIEWPORT_PAD = 12
const CURSOR_GAP = 12
const TIP_ESTIMATED_HEIGHT = 132
const TIP_PANEL_BG = '#ffffff'
const TIP_PANEL_BORDER = '#E4E4EE'
const TIP_HEADING = '#111120'
const TIP_BODY = '#7878A0'

type PlacedUsageTip = {
  left: number
  top: number
  arrowStyle: CSSProperties
}

export function placeUsageTipPanel(
  placement: UsageTipPlacement,
  point: UsageTipPoint,
  tipHeight = TIP_ESTIMATED_HEIGHT,
): PlacedUsageTip {
  if (placement === 'above-anchor') {
    const centerX = point.x
    let left = centerX - TIP_WIDTH / 2

    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD
    if (left + TIP_WIDTH > window.innerWidth - VIEWPORT_PAD) {
      left = window.innerWidth - TIP_WIDTH - VIEWPORT_PAD
    }

    const top = point.y - CURSOR_GAP
    const arrowLeft = centerX - left

    return {
      left,
      top,
      arrowStyle: {
        left: arrowLeft - 6,
        top: '100%',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: `7px solid ${TIP_PANEL_BG}`,
      },
    }
  }

  let left = point.x - TIP_WIDTH - CURSOR_GAP
  let top = point.y + CURSOR_GAP

  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD
  if (left + TIP_WIDTH > window.innerWidth - VIEWPORT_PAD) {
    left = window.innerWidth - TIP_WIDTH - VIEWPORT_PAD
  }
  if (top + tipHeight > window.innerHeight - VIEWPORT_PAD) {
    top = window.innerHeight - tipHeight - VIEWPORT_PAD
  }
  if (top < VIEWPORT_PAD) top = VIEWPORT_PAD

  return {
    left,
    top,
    arrowStyle: {
      right: 14,
      top: -7,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderBottom: `7px solid ${TIP_PANEL_BG}`,
    },
  }
}

type UsageTipOverlayProps = {
  open: boolean
  placement: UsageTipPlacement
  point: UsageTipPoint
  heading: string
  body: string
  estimatedHeight?: number
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onHideAllTips?: () => void
}

export function UsageTipOverlay({
  open,
  placement,
  point,
  heading,
  body,
  estimatedHeight,
  onMouseEnter,
  onMouseLeave,
  onHideAllTips,
}: UsageTipOverlayProps) {
  const placedRef = useRef<PlacedUsageTip | null>(null)

  if (!open) {
    placedRef.current = null
    return null
  }

  if (!placedRef.current) {
    placedRef.current = placeUsageTipPanel(placement, point, estimatedHeight ?? TIP_ESTIMATED_HEIGHT)
  }

  const placed = placedRef.current
  const panelTransform = placement === 'above-anchor' ? 'translateY(-100%)' : undefined

  return createPortal(
    <div
      className="w-[220px] rounded-lg px-3 py-2.5 text-center relative"
      style={{
        position: 'fixed',
        left: placed.left,
        top: placed.top,
        transform: panelTransform,
        zIndex: 10001,
        background: TIP_PANEL_BG,
        border: `1px solid ${TIP_PANEL_BORDER}`,
        boxShadow: '0 4px 16px rgba(30, 56, 40, 0.12)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute h-0 w-0" style={placed.arrowStyle} />
      <Lightbulb
        className="absolute top-2 right-2 w-3.5 h-3.5"
        strokeWidth={2}
        style={{ color: BRAND_GREEN }}
        aria-hidden
      />
      <p
        className="m-0 text-[11px] font-semibold text-center px-4"
        style={{ color: TIP_HEADING, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {heading}
      </p>
      <p
        className="m-0 mt-1.5 text-[10px] leading-snug text-center px-1"
        style={{ color: TIP_BODY, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {body}
      </p>
      <button
        type="button"
        className="mt-2.5 text-[10px] px-2.5 py-1 rounded-md"
        style={{
          background: BRAND_GREEN,
          border: `1px solid ${BRAND_GREEN}`,
          color: '#FFFFFF',
          fontFamily: 'var(--font-dm-sans), sans-serif',
          cursor: 'pointer',
        }}
        onClick={() => onHideAllTips?.()}
      >
        Hide all tips
      </button>
    </div>,
    document.body,
  )
}
