'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { LegalAgreementNotice } from '@/components/auth/legal-agreement-notice'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/constants'
import { signUpWithEmail } from '@/lib/auth/sign-up'
import { validateRegistrationForm } from '@/lib/auth/validation'
import { getPreviewColors } from '@/lib/preview/preview-colors'

const colors = getPreviewColors('dark')
const accent = '#C93048'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validateRegistrationForm(email, password, confirmPassword)
    if (validationError) {
      setStatus('error')
      setMessage(validationError)
      return
    }

    setStatus('loading')
    setMessage(null)

    const result = await signUpWithEmail(email, password)

    if (result.status === 'error') {
      setStatus('error')
      setMessage(result.message)
      return
    }

    setNeedsEmailConfirmation(result.needsEmailConfirmation)
    setStatus('success')
    setMessage(
      result.needsEmailConfirmation
        ? `Account created. Check your inbox at ${result.email} to confirm your email before signing in.`
        : 'Account created successfully.',
    )
    setPassword('')
    setConfirmPassword('')
  }

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="register-email"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Email
        </label>
        <input
          id="register-email"
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

      <div className="space-y-1.5">
        <label
          htmlFor="register-password"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          disabled={isLoading || isSuccess}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
          style={{
            background: colors.searchBg,
            border: `1px solid ${colors.searchBorder}`,
            color: colors.searchText,
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="register-confirm-password"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Confirm password
        </label>
        <input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          disabled={isLoading || isSuccess}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
          Creating your account…
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
        <>
          <LegalAgreementNotice mutedColor={colors.muted} accentColor={accent} />
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
            Register
          </button>
        </>
      ) : needsEmailConfirmation ? (
        <p
          className="text-xs"
          style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Did not receive an email? Check spam, or confirm that email sign-up is enabled in Supabase.
        </p>
      ) : (
        <p
          className="text-xs text-center"
          style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          <Link href="/login?next=%2F" className="no-underline" style={{ color: accent }}>
            Log in to wine list
          </Link>
        </p>
      )}
    </form>
  )
}
