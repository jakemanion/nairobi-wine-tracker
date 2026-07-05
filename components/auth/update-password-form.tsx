'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/constants'
import { updatePassword } from '@/lib/auth/reset-password'
import { validatePasswordUpdate } from '@/lib/auth/validation'
import { supabase } from '@/lib/supabase'
import { getPreviewColors } from '@/lib/preview/preview-colors'

const colors = getPreviewColors('dark')
const accent = '#C93048'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

export function UpdatePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return
      setHasSession(Boolean(session))
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = validatePasswordUpdate(password, confirmPassword)
    if (validationError) {
      setStatus('error')
      setMessage(validationError)
      return
    }

    setStatus('loading')
    setMessage(null)

    const result = await updatePassword(password)

    if (result.status === 'error') {
      setStatus('error')
      setMessage(result.message)
      return
    }

    setStatus('success')
    setMessage('Password updated. Redirecting to preview…')
    router.push('/preview')
    router.refresh()
  }

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  if (hasSession === null) {
    return (
      <p
        className="text-sm"
        style={{ color: colors.summaryText, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        role="status"
      >
        Verifying reset link…
      </p>
    )
  }

  if (!hasSession) {
    return (
      <div className="space-y-4">
        <p
          className="text-sm rounded-lg px-3 py-2.5"
          style={{
            background: 'rgba(201, 48, 72, 0.12)',
            border: `1px solid ${accent}`,
            color: '#F5A8B4',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
          role="alert"
        >
          This reset link is invalid or has expired. Request a new one.
        </p>
        <p
          className="text-xs text-center"
          style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          <Link href="/forgot-password" className="no-underline" style={{ color: accent }}>
            Request a new reset link
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="update-password"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          New password
        </label>
        <input
          id="update-password"
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
          htmlFor="update-confirm-password"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Confirm new password
        </label>
        <input
          id="update-confirm-password"
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
          Updating password…
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
          Update password
        </button>
      ) : null}
    </form>
  )
}
