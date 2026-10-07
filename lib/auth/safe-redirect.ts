/**
 * Same-origin relative paths only.
 * Allows `/`, `/admin`, `/share/abc-123`.
 * Rejects protocol-relative URLs (`//evil.com`), schemes, `//` anywhere, query/hash.
 */
const SAFE_INTERNAL_PATH = /^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/

/**
 * Returns a safe in-app path for post-auth redirects, or `fallback` if invalid.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback = '/',
): string {
  if (candidate == null) return fallback

  const trimmed = candidate.trim()
  if (!trimmed) return fallback

  // Defend against encoded tricks like %2F%2Fevil.example
  let decoded = trimmed
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    return fallback
  }

  if (!SAFE_INTERNAL_PATH.test(decoded)) return fallback
  return decoded
}
