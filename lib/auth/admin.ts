import { createAuthServerClient } from '@/lib/supabase-auth-server'
import { ADMIN_USER_ID, getCurrentUserId, isAdminUserId } from '@/lib/user'

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
 * User id used for authorization on this request.
 * Prefers a real session; falls back to the pre-login stub user.
 */
export async function getActorUserId(): Promise<string> {
  return (await getSessionUserId()) ?? getCurrentUserId()
}

export async function isActorAdmin(): Promise<boolean> {
  return isAdminUserId(await getActorUserId())
}

export async function requireAdminAccess(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (await isActorAdmin()) return { ok: true }
  return { ok: false, error: ADMIN_UNAUTHORIZED_MESSAGE }
}

export { ADMIN_USER_ID, isAdminUserId }
