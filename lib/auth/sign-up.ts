import { supabase } from '@/lib/supabase'

export type SignUpResult =
  | { status: 'success'; needsEmailConfirmation: boolean; email: string; userId: string }
  | { status: 'error'; message: string }

export async function signUpWithEmail(
  email: string,
  password: string,
  options?: { newsletterOptIn?: boolean },
): Promise<SignUpResult> {
  const trimmedEmail = email.trim()
  const newsletterOptIn = Boolean(options?.newsletterOptIn)

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        newsletter_opt_in: newsletterOptIn,
      },
    },
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (data.user?.identities?.length === 0) {
    return { status: 'error', message: 'An account with this email already exists.' }
  }

  if (!data.user) {
    return { status: 'error', message: 'Registration did not return a user.' }
  }

  return {
    status: 'success',
    needsEmailConfirmation: data.session === null,
    email: trimmedEmail,
    userId: data.user.id,
  }
}
