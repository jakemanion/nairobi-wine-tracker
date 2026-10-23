'use client'

import { FeedbackEntry } from '@/components/preview/feedback-entry'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type FooterFeedbackLinkProps = {
  colors: PreviewColors
}

/** Client island for the desktop footer Feedback control (avoids RSC function-children). */
export function FooterFeedbackLink({ colors }: FooterFeedbackLinkProps) {
  return (
    <FeedbackEntry colors={colors}>
      {(openFeedback) => (
        <button
          type="button"
          onClick={openFeedback}
          className="text-[11px] no-underline hover:underline underline-offset-2 bg-transparent p-0 border-0 cursor-pointer"
          style={{
            color: colors.headerAccent,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Feedback
        </button>
      )}
    </FeedbackEntry>
  )
}
