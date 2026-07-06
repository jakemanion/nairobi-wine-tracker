'use client'

import { createPortal } from 'react-dom'
import { Lightbulb } from 'lucide-react'
import type { CSSProperties } from 'react'

export type UsageTipPlacement = 'bottom-left-of-cursor' | 'above-anchor'

export type UsageTipPoint = {
  x: number
  y: number
}

const TIP_WIDTH = 220
const VIEWPORT_PAD = 12
const CURSOR_GAP = 12
const TIP_ESTIMATED_HEIGHT = 132

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
        borderTop: '7px solid #3A3848',
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
      borderBottom: '7px solid #3A3848',
    },
  }
}

type UsageTipOverlayProps = {
  open: boolean
  placement: UsageTipPlacement
  point: UsageTipPoint
  heading: string
  body: string
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
  onMouseEnter,
  onMouseLeave,
  onHideAllTips,
}: UsageTipOverlayProps) {
  if (!open) return null

  const placed = placeUsageTipPanel(placement, point)
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
        background: '#111218',
        border: '1px solid #3A3848',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute h-0 w-0" style={placed.arrowStyle} />
      <Lightbulb
        className="absolute top-2 right-2 w-3.5 h-3.5"
        strokeWidth={2}
        style={{ color: '#E8C840' }}
        aria-hidden
      />
      <p
        className="m-0 text-[11px] font-semibold text-center px-4"
        style={{ color: '#F5F2EC', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {heading}
      </p>
      <p
        className="m-0 mt-1.5 text-[10px] leading-snug text-center px-1"
        style={{ color: '#D0CED4', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {body}
      </p>
      <button
        type="button"
        className="mt-2.5 text-[10px] px-2.5 py-1 rounded-md"
        style={{
          background: '#C93048',
          border: '1px solid #C93048',
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
