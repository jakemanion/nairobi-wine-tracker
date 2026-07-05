'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { requestPasswordReset } from '@/lib/auth/reset-password'
import { validateEmail } from '@/lib/auth/validation'
import { getPreviewColors } from '@/lib/preview/preview-colors'

const colors = getPreviewColors('dark')
const accent = '#C93048'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validateEmail(email)
    if (validationError) {
      setStatus('error')
      setMessage(validationError)
      return
    }

    setStatus('loading')
    setMessage(null)

    const result = await requestPasswordReset(email)

    if (result.status === 'error') {
      setStatus('error')
      setMessage(result.message)
      return
    }

    setStatus('success')
    setMessage(
      `If an account exists for ${result.email}, we sent a password reset link. Check your inbox and spam folder.`,
    )
  }

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="forgot-password-email"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Email
        </label>
        <input
          id="forgot-password-email"
          type="email"
          autoComplete="email"
          required
          disabled={isLoading || isSuccess}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
          style={{
            background: colors.searchBg,
            border: `1px solid ${colors.searchBorder}`,
            color: colors.searchText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        />
      </div>

      {isLoading ? (
        <p
          className="text-sm"
          style={{ color: colors.summaryText, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          role="status"
        >
          Sending reset link…
        </p>
      ) : null}

      {message ? (
        <p
          className="text-sm rounded-lg px-3 py-2.5"
          style={{
            background: status === 'success' ? 'rgba(72, 200, 104, 0.12)' : 'rgba(201, 48, 72, 0.12)',
            border: `1px solid ${status === 'success' ? '#48C868' : accent}`,
            color: status === 'success' ? '#B8F0C8' : '#F5A8B4',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}

      {!isSuccess ? (
        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-sm font-medium px-4 py-2.5 rounded-lg"
          style={{
            background: accent,
            border: `1px solid ${accent}`,
            color: '#FFFFFF',
            fontFamily: 'var(--font-dm-sans), sans-serif',
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          Send reset link
        </button>
      ) : null}

      <p
        className="text-xs text-center"
        style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        Remember your password?{' '}
        <Link href="/login" className="no-underline" style={{ color: accent }}>
          Back to log in
        </Link>
      </p>
    </form>
  )
}
