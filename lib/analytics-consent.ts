export const ANALYTICS_CONSENT_STORAGE_KEY = 'wine-diviner-analytics-consent'

export type AnalyticsConsent = 'granted' | 'denied'

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    if (value === 'granted' || value === 'denied') return value
  } catch {
    // Ignore storage errors.
  }
  return null
}

export function writeAnalyticsConsent(value: AnalyticsConsent): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value)
  } catch {
    // Ignore storage errors.
  }
}

export function hasAnalyticsConsent(): boolean {
  return readAnalyticsConsent() === 'granted'
}
