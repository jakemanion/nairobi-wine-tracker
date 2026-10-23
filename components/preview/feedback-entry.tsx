'use client'

import { useState, type ReactNode } from 'react'
import { FeedbackModal } from '@/components/preview/feedback-modal'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type FeedbackEntryProps = {
  colors: PreviewColors
  children: (open: () => void) => ReactNode
}

/** Owns feedback modal open state so callers (footer link, mobile button) stay simple. */
export function FeedbackEntry({ colors, children }: FeedbackEntryProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {children(() => setOpen(true))}
      <FeedbackModal open={open} colors={colors} onClose={() => setOpen(false)} />
    </>
  )
}
