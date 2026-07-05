import type { Metadata } from 'next'
import { AuthScreen } from '@/components/auth/auth-screen'
import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export const metadata: Metadata = {
  title: 'Set new password · WineDiviner: Nairobi',
}

export default function UpdatePasswordPage() {
  return (
    <AuthScreen
      title="WineDiviner: Nairobi"
      subtitle="Choose a new password"
      heading="Set new password"
      description="Enter a new password for your account."
      backHref="/login"
      backLabel="Back to log in"
    >
      <UpdatePasswordForm />
    </AuthScreen>
  )
}
