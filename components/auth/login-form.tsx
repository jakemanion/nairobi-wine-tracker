'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { signInWithEmail } from '@/lib/auth/sign-in'
import { validateEmail } from '@/lib/auth/validation'
import { getPreviewColors } from '@/lib/preview/preview-colors'

const colors = getPreviewColors('dark')
const accent = '#C93048'

type FormStatus = 'idle' | 'loading' | 'error'

type LoginFormProps = {
  nextPath?: string
  initialError?: string | null
}

export function LoginForm({ nextPath = '/', initialError = null }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState<string | null>(initialError)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = email.trim()
    const validationError = validateEmail(trimmedEmail)
    if (validationError) {
      setStatus('error')
      setMessage(validationError)
      return
    }
    if (!password) {
      setStatus('error')
      setMessage('Password is required.')
      return
    }

    setStatus('loading')
    setMessage(null)

    const result = await signInWithEmail(trimmedEmail, password)

    if (result.status === 'error') {
      setStatus('error')
      setMessage(result.message)
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  const isLoading = status === 'loading'

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="login-email"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          disabled={isLoading}
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
          htmlFor="login-password"
          className="block text-xs font-medium"
          style={{ color: colors.labelMuted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isLoading}
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
        <p className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs no-underline"
            style={{ color: accent, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Forgot password?
          </Link>
        </p>
      </div>

      {isLoading ? (
        <p
          className="text-sm"
          style={{ color: colors.summaryText, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          role="status"
        >
          Signing you in…
        </p>
      ) : null}

      {message ? (
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
          {message}
        </p>
      ) : null}

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
        Log in
      </button>

      <p
        className="text-xs text-center"
        style={{ color: colors.muted, fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        No account?{' '}
        <Link href="/register" className="no-underline" style={{ color: accent }}>
          Register for free
        </Link>
      </p>
    </form>
  )
}
