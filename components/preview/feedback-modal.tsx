'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, X } from 'lucide-react'
import {
  SITE_FEEDBACK_CONTACT_MAX_LENGTH,
  SITE_FEEDBACK_MESSAGE_MAX_LENGTH,
} from '@/lib/feedback/constants'
import { submitSiteFeedback } from '@/lib/feedback/feedback-actions'
import { trackEvent } from '@/lib/analytics'
import type { PreviewColors } from '@/lib/preview/preview-colors'

type FeedbackModalProps = {
  open: boolean
  colors: PreviewColors
  onClose: () => void
}

function subscribeNoop() {
  return () => {}
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false)
}

export function FeedbackModal({ open, colors, onClose }: FeedbackModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const isClient = useIsClient()
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) return
    setMessage('')
    setContact('')
    setError(null)
    setSubmitting(false)
    setSuccess(false)
    const timer = window.setTimeout(() => messageRef.current?.focus(), 0)
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

    setSubmitting(true)
    setError(null)

    const result = await submitSiteFeedback({
      message,
      contact,
    })

    setSubmitting(false)

    if (result.error || !result.feedback) {
      setError(result.error ?? 'Failed to submit feedback. Please try again.')
      return
    }

    setSuccess(true)
    trackEvent('site_feedback_submitted', {
      has_contact: Boolean(result.feedback.contact),
    })
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
          Send feedback
        </h2>
        <p
          id={descriptionId}
          className="m-0 mt-2 text-[12px] leading-relaxed"
          style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Tell us what&apos;s working, what isn&apos;t, or what you&apos;d like to see next.
        </p>

        {success ? (
          <p
            className="m-0 mt-4 text-[13px]"
            role="status"
            aria-live="polite"
            style={{ color: colors.accent, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Thanks — your feedback was submitted.
          </p>
        ) : (
          <form
            className="mt-4 flex flex-col gap-3.5"
            onSubmit={(e) => void handleSubmit(e)}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="site-feedback-message"
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                Your feedback
              </label>
              <textarea
                id="site-feedback-message"
                ref={messageRef}
                required
                value={message}
                disabled={submitting}
                maxLength={SITE_FEEDBACK_MESSAGE_MAX_LENGTH}
                rows={5}
                onChange={(event) => {
                  setMessage(event.target.value)
                  setError(null)
                }}
                placeholder="Share a bug, idea, or anything else…"
                className="w-full text-[13px] px-2.5 py-2 outline-none resize-y min-h-[110px]"
                style={{
                  background: colors.searchBg,
                  border: `1px solid ${colors.searchBorder}`,
                  color: colors.searchText,
                  borderRadius: colors.panelRadius,
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="site-feedback-contact"
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                Contact <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="site-feedback-contact"
                type="text"
                value={contact}
                disabled={submitting}
                maxLength={SITE_FEEDBACK_CONTACT_MAX_LENGTH}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Email or phone if you'd like a reply"
                className="w-full text-[13px] px-2.5 py-2 outline-none"
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
                  'Send feedback'
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
