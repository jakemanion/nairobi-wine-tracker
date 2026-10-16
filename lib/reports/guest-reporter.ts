import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { WINE_REPORT_UUID_RE } from '@/lib/reports/constants'

export const WINE_REPORT_GUEST_COOKIE = 'wd_report_guest'

const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year

export async function getOrCreateGuestReporterKey(): Promise<string> {
  const store = await cookies()
  const existing = store.get(WINE_REPORT_GUEST_COOKIE)?.value?.trim()
  if (existing && WINE_REPORT_UUID_RE.test(existing)) {
    return existing
  }

  const guestKey = randomUUID()
  store.set(WINE_REPORT_GUEST_COOKIE, guestKey, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
  })
  return guestKey
}

export async function getGuestReporterKey(): Promise<string | null> {
  const store = await cookies()
  const existing = store.get(WINE_REPORT_GUEST_COOKIE)?.value?.trim()
  if (existing && WINE_REPORT_UUID_RE.test(existing)) return existing
  return null
}
