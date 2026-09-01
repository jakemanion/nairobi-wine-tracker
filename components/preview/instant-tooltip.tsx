'use client'

import {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
} from 'react'
import { createPortal } from 'react-dom'

const TOOLTIP_GAP_PX = 6

const tooltipStyle: CSSProperties = {
  position: 'fixed',
  padding: '4px 8px',
  borderRadius: 6,
  fontSize: 11,
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 10000,
  background: '#1A1A22',
  color: '#E8E6F0',
  border: '1px solid #3A3848',
  fontFamily: 'var(--font-dm-sans), sans-serif',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  transform: 'translate(-50%, -100%)',
}

type InstantTooltipProps = {
  label: string
  children: ReactElement<{
    title?: string
    onMouseEnter?: (event: MouseEvent) => void
    onMouseLeave?: (event: MouseEvent) => void
    onFocus?: (event: FocusEvent) => void
    onBlur?: (event: FocusEvent) => void
  }>
  className?: string
}

export function InstantTooltip({ label, children, className }: InstantTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const anchorRef = useRef<HTMLSpanElement>(null)

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    setPosition({
      top: rect.top - TOOLTIP_GAP_PX,
      left: rect.left + rect.width / 2,
    })
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!visible) return

    updatePosition()

    function handleReposition() {
      updatePosition()
    }

    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)

    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [visible, updatePosition])

  const child = cloneElement(children, {
    title: undefined,
    onMouseEnter: (event: MouseEvent) => {
      updatePosition()
      setVisible(true)
      children.props.onMouseEnter?.(event)
    },
    onMouseLeave: (event: MouseEvent) => {
      setVisible(false)
      children.props.onMouseLeave?.(event)
    },
    onFocus: (event: FocusEvent) => {
      updatePosition()
      setVisible(true)
      children.props.onFocus?.(event)
    },
    onBlur: (event: FocusEvent) => {
      setVisible(false)
      children.props.onBlur?.(event)
    },
  })

  return (
    <>
      <span ref={anchorRef} className={`relative inline-flex ${className ?? ''}`}>
        {child}
      </span>
      {mounted && visible
        ? createPortal(
            <span
              role="tooltip"
              style={{
                ...tooltipStyle,
                top: position.top,
                left: position.left,
              }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  )
}
