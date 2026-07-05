/**
 * Sole account with admin privileges (wine matching, catalog edits).
 * Must match this user's `auth.users.id` / `profiles.id` in Supabase.
 */
export const ADMIN_USER_ID = 'd0c4ffdd-e051-4a99-99d8-dde209adaf05'

/**
 * Temporary identity for reviews/profile until login wires the session through.
 * Currently the same as the admin account.
 */
export const DEFAULT_USER_ID = ADMIN_USER_ID

export function isAdminUserId(userId: string | null | undefined): boolean {
  return userId === ADMIN_USER_ID
}

export function getCurrentUserId(): string {
  // TODO: replace with the authenticated user's id
  return DEFAULT_USER_ID
}
