import {
  SITE_FEEDBACK_CONTACT_MAX_LENGTH,
  SITE_FEEDBACK_MESSAGE_MAX_LENGTH,
  SITE_FEEDBACK_RESOLUTION_NOTE_MAX_LENGTH,
  SITE_FEEDBACK_STATUSES,
  SITE_FEEDBACK_UUID_RE,
  type SiteFeedbackStatus,
} from '@/lib/feedback/constants'

export function isSiteFeedbackStatus(value: unknown): value is SiteFeedbackStatus {
  return typeof value === 'string' && (SITE_FEEDBACK_STATUSES as readonly string[]).includes(value)
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && SITE_FEEDBACK_UUID_RE.test(value)
}

export function normalizeFeedbackMessage(
  value: unknown,
): { ok: true; message: string } | { ok: false; error: string } {
  if (typeof value !== 'string') {
    return { ok: false, error: 'Please enter your feedback.' }
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: false, error: 'Please enter your feedback.' }
  }
  if (trimmed.length > SITE_FEEDBACK_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Feedback must be ${SITE_FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`,
    }
  }
  return { ok: true, message: trimmed }
}

export function normalizeFeedbackContact(
  value: unknown,
): { ok: true; contact: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, contact: null }
  if (typeof value !== 'string') {
    return { ok: false, error: 'Contact must be text.' }
  }
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, contact: null }
  if (trimmed.length > SITE_FEEDBACK_CONTACT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Contact must be ${SITE_FEEDBACK_CONTACT_MAX_LENGTH} characters or fewer.`,
    }
  }
  return { ok: true, contact: trimmed }
}

export function normalizeResolutionNote(
  value: unknown,
): { ok: true; note: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, note: null }
  if (typeof value !== 'string') {
    return { ok: false, error: 'Resolution note must be text.' }
  }
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, note: null }
  if (trimmed.length > SITE_FEEDBACK_RESOLUTION_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Resolution note must be ${SITE_FEEDBACK_RESOLUTION_NOTE_MAX_LENGTH} characters or fewer.`,
    }
  }
  return { ok: true, note: trimmed }
}

export type SubmitSiteFeedbackInput = {
  message: unknown
  contact?: unknown
}

export type ValidatedSubmitSiteFeedback = {
  message: string
  contact: string | null
}

export function validateSubmitSiteFeedbackInput(
  input: SubmitSiteFeedbackInput,
): { ok: true; data: ValidatedSubmitSiteFeedback } | { ok: false; error: string } {
  const messageResult = normalizeFeedbackMessage(input.message)
  if (!messageResult.ok) return messageResult

  const contactResult = normalizeFeedbackContact(input.contact)
  if (!contactResult.ok) return contactResult

  return {
    ok: true,
    data: {
      message: messageResult.message,
      contact: contactResult.contact,
    },
  }
}
