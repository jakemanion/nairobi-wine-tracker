/**
 * Sole account with admin privileges (wine matching, catalog edits).
 * Must match this user's `auth.users.id` / `profiles.id` in Supabase.
 */
export const ADMIN_USER_ID = 'd0c4ffdd-e051-4a99-99d8-dde209adaf05'

/**
 * Temporary identity for the classic view until that page uses sessions.
 * Preview uses the authenticated session via getPreviewSession().
 */
export const DEFAULT_USER_ID = ADMIN_USER_ID

export function isAdminUserId(userId: string | null | undefined): boolean {
  return userId === ADMIN_USER_ID
}

export function getCurrentUserId(): string {
  // TODO: replace with the authenticated user's id
  return DEFAULT_USER_ID
}
