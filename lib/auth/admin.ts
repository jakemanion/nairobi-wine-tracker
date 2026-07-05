import { createAuthServerClient } from '@/lib/supabase-auth-server'
import { ADMIN_USER_ID, isAdminUserId } from '@/lib/user'

export const ADMIN_UNAUTHORIZED_MESSAGE =
  'You do not have permission to access admin tools.'

/** Authenticated user id from the request session, if any. */
export async function getSessionUserId(): Promise<string | null> {
  const supabase = await createAuthServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * True only when the current request has a logged-in session for the admin user.
 */
export async function isActorAdmin(): Promise<boolean> {
  const userId = await getSessionUserId()
  if (!userId) return false
  return isAdminUserId(userId)
}

export async function requireAdminAccess(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (await isActorAdmin()) return { ok: true }
  return { ok: false, error: ADMIN_UNAUTHORIZED_MESSAGE }
}

export { ADMIN_USER_ID, isAdminUserId }
