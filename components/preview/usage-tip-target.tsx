'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { UsageTipOverlay } from '@/components/preview/usage-tip-overlay'
import { useUsageTips } from '@/components/preview/usage-tips-context'
import { USAGE_TIPS, type UsageTipId } from '@/lib/preview/usage-tips'

const HOVER_CLOSE_DELAY_MS = 120

type UsageTipTargetProps = {
  tipId: UsageTipId
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function UsageTipTarget({ tipId, children, className, style }: UsageTipTargetProps) {
  const { enabled, hideAllTips } = useUsageTips()
  const tip = USAGE_TIPS[tipId]
  const [open, setOpen] = useState(false)
  const [point, setPoint] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)

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

  useEffect(() => {
    if (!enabled) setOpen(false)
  }, [enabled])

  function cancelClose() {
    if (closeTimeoutRef.current != null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  function scheduleClose() {
    cancelClose()
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimeoutRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  function openTip(event: MouseEvent) {
    if (!enabled) return
    cancelClose()
    if (!open) {
      setPoint({ x: event.clientX, y: event.clientY })
      setOpen(true)
    }
  }

  function closeTip() {
    cancelClose()
    setOpen(false)
  }

  return (
    <div className={className} style={style} onMouseEnter={openTip} onMouseLeave={scheduleClose}>
      {children}
      {mounted ? (
        <UsageTipOverlay
          open={open && enabled}
          placement="bottom-left-of-cursor"
          point={point}
          heading={tip.heading}
          body={tip.body}
          estimatedHeight={tip.estimatedHeight}
          onMouseEnter={cancelClose}
          onMouseLeave={closeTip}
          onHideAllTips={hideAllTips}
        />
      ) : null}
    </div>
  )
}
