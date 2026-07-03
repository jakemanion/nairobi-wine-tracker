import { supabase } from '@/lib/supabase'

export type SignUpResult =
  | { status: 'success'; needsEmailConfirmation: boolean; email: string }
  | { status: 'error'; message: string }

export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  const trimmedEmail = email.trim()

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (data.user?.identities?.length === 0) {
    return { status: 'error', message: 'An account with this email already exists.' }
  }

  return {
    status: 'success',
    needsEmailConfirmation: data.user !== null && data.session === null,
    email: trimmedEmail,
  }
}
