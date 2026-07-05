import type { Metadata } from 'next'
import { AuthScreen } from '@/components/auth/auth-screen'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Register · WineDiviner: Nairobi',
}

export default function RegisterPage() {
  return (
    <AuthScreen
      title="WineDiviner: Nairobi"
      subtitle="Create an account"
      heading="Register"
      description="Create an account to save your wine shortlist and reviews."
    >
      <RegisterForm />
    </AuthScreen>
  )
}
