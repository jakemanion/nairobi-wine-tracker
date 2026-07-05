import { supabase } from '@/lib/supabase'
import { getSiteUrl } from '@/lib/auth/site-url'

export type PasswordResetRequestResult =
  | { status: 'success'; email: string }
  | { status: 'error'; message: string }

export type UpdatePasswordResult =
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
  const trimmedEmail = email.trim()
  const redirectTo = `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent('/auth/update-password')}`

  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo,
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  return { status: 'success', email: trimmedEmail }
}

export async function updatePassword(password: string): Promise<UpdatePasswordResult> {
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { status: 'error', message: error.message }
  }

  return { status: 'success' }
}
