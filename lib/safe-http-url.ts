/**
 * Allow only absolute http(s) URLs for href/src and admin writes.
 * Rejects javascript:, data:, protocol-relative, and relative paths.
 */
export function sanitizeHttpUrl(value: string | null | undefined): string | null {
  if (value == null) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  return trimmed
}

/** True when `value` is a non-empty http(s) URL. */
export function isSafeHttpUrl(value: string | null | undefined): boolean {
  return sanitizeHttpUrl(value) != null
}

/**
 * For admin writes: empty clears the field; non-empty must be http(s).
 */
export function normalizeOptionalHttpUrl(
  value: string | number | boolean | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null || value === '') {
    return { ok: true, value: null }
  }
  if (typeof value !== 'string') {
    return { ok: false, error: 'URL must be text.' }
  }
  const safe = sanitizeHttpUrl(value)
  if (!safe) {
    return {
      ok: false,
      error: 'URL must be an absolute http:// or https:// link.',
    }
  }
  return { ok: true, value: safe }
}
