'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { InstantTooltip } from '@/components/preview/instant-tooltip'
import { ReportErrorModal } from '@/components/preview/report-error-modal'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'

type ReportErrorButtonProps = {
  wineId: string
  wineLabel: string
  storeListingId?: string | null
  alreadyReported: boolean
  /** When true, nest beside admin Edit in the top-right corner. */
  compact?: boolean
}

export function ReportErrorButton({
  wineId,
  wineLabel,
  storeListingId = null,
  alreadyReported,
  compact = true,
}: ReportErrorButtonProps) {
  const { colors } = usePreviewTheme()
  const [open, setOpen] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [submitted, setSubmitted] = useState(alreadyReported)

  const isSubmitted = submitted || alreadyReported

  if (isSubmitted) {
    return (
      <span
        className="inline-flex items-center gap-1"
        style={{
          height: 18,
          padding: compact ? '0 6px' : '0 8px',
          borderRadius: colors.panelRadius,
          color: colors.muted,
          fontFamily: 'var(--font-dm-sans), sans-serif',
          fontSize: 10,
          lineHeight: 1,
          opacity: 0.85,
        }}
        aria-label="Report submitted for this wine"
      >
        <Flag size={10} strokeWidth={2} aria-hidden />
        Report submitted
      </span>
    )
  }

  return (
    <>
      <InstantTooltip label="Report an error with this listing">
        <button
          type="button"
          aria-label={`Report a problem with ${wineLabel}`}
          className="inline-flex items-center gap-1"
          style={{
            height: 18,
            padding: compact ? '0 6px' : '0 8px',
            borderRadius: colors.panelRadius,
            background: colors.buttonBg,
            border: `1px solid ${colors.buttonBorder}`,
            color: colors.buttonText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
            fontSize: 10,
            lineHeight: 1,
            cursor: 'pointer',
            opacity: 0.9,
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setSessionKey((key) => key + 1)
            setOpen(true)
          }}
        >
          <Flag size={10} strokeWidth={2} aria-hidden />
          Report error
        </button>
      </InstantTooltip>

      {open ? (
        <ReportErrorModal
          key={sessionKey}
          open={open}
          wineId={wineId}
          wineLabel={wineLabel}
          storeListingId={storeListingId}
          onClose={() => setOpen(false)}
          onSubmitted={() => setSubmitted(true)}
        />
      ) : null}
    </>
  )
}
