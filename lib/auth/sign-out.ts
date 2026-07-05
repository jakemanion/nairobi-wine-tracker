import { supabase } from '@/lib/supabase'

export type SignOutResult = { status: 'success' } | { status: 'error'; message: string }

export async function signOut(): Promise<SignOutResult> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { status: 'error', message: error.message }
  }

  return { status: 'success' }
}
