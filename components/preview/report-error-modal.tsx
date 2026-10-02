'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import { usePreviewTheme } from '@/components/preview/preview-theme-context'
import {
  WINE_REPORT_ISSUE_LABELS,
  WINE_REPORT_ISSUE_TYPES,
  WINE_REPORT_DESCRIPTION_MAX_LENGTH,
  type WineReportIssueType,
} from '@/lib/reports/constants'
import { submitWineReport } from '@/lib/reports/report-actions'

type ReportErrorModalProps = {
  open: boolean
  wineId: string
  wineLabel: string
  storeListingId?: string | null
  onClose: () => void
  onSubmitted: () => void
}

function subscribeNoop() {
  return () => {}
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false)
}

export function ReportErrorModal({
  open,
  wineId,
  wineLabel,
  storeListingId = null,
  onClose,
  onSubmitted,
}: ReportErrorModalProps) {
  const { colors } = usePreviewTheme()
  const titleId = useId()
  const descriptionId = useId()
  const firstFieldRef = useRef<HTMLSelectElement>(null)
  const isClient = useIsClient()
  const [issueType, setIssueType] = useState<WineReportIssueType | ''>('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, submitting])

  if (!isClient || !open) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return

    if (!issueType) {
      setError('Please select an issue category.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await submitWineReport({
      wineId,
      storeListingId,
      issueType,
      description: details,
    })

    setSubmitting(false)

    if (result.error || !result.report) {
      setError(result.error ?? 'Failed to submit report. Please try again.')
      return
    }

    setSuccess(true)
    setIssueType('')
    setDetails('')
    onSubmitted()
    window.setTimeout(() => {
      onClose()
    }, 700)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0"
        style={{ background: 'rgba(10, 10, 14, 0.55)', border: 'none', cursor: 'pointer' }}
        disabled={submitting}
        onClick={() => {
          if (!submitting) onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-lg p-5 sm:p-6"
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.toolbarBorder}`,
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
        }}
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex items-center justify-center rounded-sm hover:opacity-80"
          style={{
            color: colors.muted,
            background: 'none',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
          disabled={submitting}
          onClick={onClose}
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <h2
          id={titleId}
          className="m-0 text-lg font-semibold pr-8"
          style={{ color: colors.headerTitle, fontFamily: colors.headingFont }}
        >
          Report a problem
        </h2>
        <p
          id={descriptionId}
          className="m-0 mt-2 text-[12px] leading-relaxed"
          style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Help us keep WineDiviner accurate. What&apos;s wrong with this listing?
        </p>
        <p
          className="m-0 mt-1.5 text-[11px] truncate"
          style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          title={wineLabel}
        >
          {wineLabel}
        </p>

        {success ? (
          <p
            className="m-0 mt-4 text-[13px]"
            role="status"
            aria-live="polite"
            style={{ color: colors.accent, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Thanks — your report was submitted.
          </p>
        ) : (
          <form className="mt-4 flex flex-col gap-3.5" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="report-issue-type"
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                Issue category
              </label>
              <select
                id="report-issue-type"
                ref={firstFieldRef}
                required
                value={issueType}
                disabled={submitting}
                onChange={(event) => {
                  setIssueType(event.target.value as WineReportIssueType | '')
                  setError(null)
                }}
                className="w-full text-[13px] px-2.5 py-2 outline-none"
                style={{
                  background: colors.searchBg,
                  border: `1px solid ${colors.searchBorder}`,
                  color: colors.searchText,
                  borderRadius: colors.panelRadius,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              >
                <option value="">Select an issue…</option>
                {WINE_REPORT_ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {WINE_REPORT_ISSUE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="report-details"
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                Additional details <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="report-details"
                value={details}
                disabled={submitting}
                maxLength={WINE_REPORT_DESCRIPTION_MAX_LENGTH}
                rows={4}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Anything that helps us investigate…"
                className="w-full text-[13px] px-2.5 py-2 outline-none resize-y min-h-[88px]"
                style={{
                  background: colors.searchBg,
                  border: `1px solid ${colors.searchBorder}`,
                  color: colors.searchText,
                  borderRadius: colors.panelRadius,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              />
            </div>

            {error ? (
              <p
                className="m-0 text-[12px]"
                role="alert"
                style={{ color: colors.errorText, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="inline-flex items-center justify-center px-3 py-1.5 text-[12px]"
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.buttonBorder}`,
                  color: colors.buttonText,
                  borderRadius: colors.buttonRadius,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: colors.accent,
                  border: `1px solid ${colors.accent}`,
                  color: '#fff',
                  borderRadius: colors.buttonRadius,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.85 : 1,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  'Submit report'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
