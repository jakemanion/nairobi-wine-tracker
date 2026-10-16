import { supabase } from '@/lib/supabase'

export type SignInResult =
  | { status: 'success'; userId: string }
  | { status: 'error'; message: string }

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const trimmedEmail = email.trim()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (!data.user) {
    return { status: 'error', message: 'Sign-in did not return a user.' }
  }

  return { status: 'success', userId: data.user.id }
}
