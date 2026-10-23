export const SITE_FEEDBACK_STATUSES = ['open', 'resolved'] as const
export type SiteFeedbackStatus = (typeof SITE_FEEDBACK_STATUSES)[number]

export const SITE_FEEDBACK_MESSAGE_MAX_LENGTH = 2000
export const SITE_FEEDBACK_CONTACT_MAX_LENGTH = 200
export const SITE_FEEDBACK_RESOLUTION_NOTE_MAX_LENGTH = 2000

/** Max feedback submissions a single user or guest may submit per rolling hour. */
export const SITE_FEEDBACK_RATE_LIMIT_PER_HOUR = 5

export const SITE_FEEDBACK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
