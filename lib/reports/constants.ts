/** Issue categories for wine accuracy reports. Keep in sync with migration CHECK. */
export const WINE_REPORT_ISSUE_TYPES = [
  'incorrect_price',
  'incorrect_wine_or_vintage',
  'incorrect_vivino_rating',
  'wrong_retailer_or_availability',
  'duplicate_listing',
  'incorrect_wine_information',
  'other',
] as const

export type WineReportIssueType = (typeof WINE_REPORT_ISSUE_TYPES)[number]

export const WINE_REPORT_ISSUE_LABELS: Record<WineReportIssueType, string> = {
  incorrect_price: 'Incorrect price',
  incorrect_wine_or_vintage: 'Incorrect wine or vintage',
  incorrect_vivino_rating: 'Incorrect Vivino rating',
  wrong_retailer_or_availability: 'Wrong retailer or availability',
  duplicate_listing: 'Duplicate listing',
  incorrect_wine_information: 'Incorrect wine information',
  other: 'Other',
}

export const WINE_REPORT_STATUSES = ['open', 'resolved'] as const
export type WineReportStatus = (typeof WINE_REPORT_STATUSES)[number]

export const WINE_REPORT_DESCRIPTION_MAX_LENGTH = 2000
export const WINE_REPORT_RESOLUTION_NOTE_MAX_LENGTH = 2000

/** Max reports a single user may submit per rolling hour. */
export const WINE_REPORT_RATE_LIMIT_PER_HOUR = 10

export const WINE_REPORT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
