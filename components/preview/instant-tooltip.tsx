'use client'

import {
  cloneElement,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
} from 'react'

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '4px 8px',
  borderRadius: 6,
  fontSize: 11,
  lineHeight: 1.3,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 200,
  background: '#1A1A22',
  color: '#E8E6F0',
  border: '1px solid #3A3848',
  fontFamily: 'var(--font-dm-sans), sans-serif',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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

  const child = cloneElement(children, {
    title: undefined,
    onMouseEnter: (event: MouseEvent) => {
      setVisible(true)
      children.props.onMouseEnter?.(event)
    },
    onMouseLeave: (event: MouseEvent) => {
      setVisible(false)
      children.props.onMouseLeave?.(event)
    },
    onFocus: (event: FocusEvent) => {
      setVisible(true)
      children.props.onFocus?.(event)
    },
    onBlur: (event: FocusEvent) => {
      setVisible(false)
      children.props.onBlur?.(event)
    },
  })

  return (
    <span className={`relative inline-flex ${className ?? ''}`}>
      {child}
      {visible ? (
        <span role="tooltip" style={tooltipStyle}>
          {label}
        </span>
      ) : null}
    </span>
  )
}
