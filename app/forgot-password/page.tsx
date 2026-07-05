import type { Metadata } from 'next'
import { AuthScreen } from '@/components/auth/auth-screen'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password · WineDiviner: Nairobi',
}

export default function ForgotPasswordPage() {
  return (
    <AuthScreen
      title="WineDiviner: Nairobi"
      subtitle="Reset your password"
      heading="Forgot password"
      description="Enter your account email and we will send you a reset link."
      backHref="/login"
      backLabel="Back to log in"
    >
      <ForgotPasswordForm />
    </AuthScreen>
  )
}
