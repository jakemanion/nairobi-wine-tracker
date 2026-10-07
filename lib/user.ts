/**
 * Sole account with admin privileges (wine matching, catalog edits).
 * Must match this user's `auth.users.id` / `profiles.id` in Supabase.
 */
export const ADMIN_USER_ID = 'd0c4ffdd-e051-4a99-99d8-dde209adaf05'

export function isAdminUserId(userId: string | null | undefined): boolean {
  return userId === ADMIN_USER_ID
}
