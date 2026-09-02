import type { Metadata } from 'next'
import { AuthScreen } from '@/components/auth/auth-screen'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Log in · WineDiviner: Nairobi',
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams
  const nextPath = next && next.startsWith('/') ? next : '/'
  const initialError =
    error === 'invalid_reset_link'
      ? 'That password reset link is invalid or has expired. Request a new one from Forgot password.'
      : null

  return (
    <AuthScreen
      title="WineDiviner: Nairobi"
      subtitle="Sign in to your account"
      heading="Log in"
      description="Access your bookmarks, ratings, and shortlist."
    >
      <LoginForm nextPath={nextPath} initialError={initialError} />
    </AuthScreen>
  )
}
