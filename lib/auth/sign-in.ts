import { supabase } from '@/lib/supabase'

export type SignInResult =
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const trimmedEmail = email.trim()

  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  return { status: 'success' }
}
