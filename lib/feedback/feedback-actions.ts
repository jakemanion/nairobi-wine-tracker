'use server'

import { getPreviewSession } from '@/lib/auth/preview-session'
import { SITE_FEEDBACK_RATE_LIMIT_PER_HOUR } from '@/lib/feedback/constants'
import type { SiteFeedbackRecord } from '@/lib/feedback/types'
import {
  validateSubmitSiteFeedbackInput,
  type SubmitSiteFeedbackInput,
} from '@/lib/feedback/validation'
import { getOrCreateGuestReporterKey } from '@/lib/reports/guest-reporter'
import { createAdminClient } from '@/lib/supabase-admin'
import { logPostHogInfo } from '@/lib/posthog-logs'
import { createAuthServerClient } from '@/lib/supabase-auth-server'

const FEEDBACK_SELECT = `
  id,
  user_id,
  guest_key,
  message,
  contact,
  status,
  created_at,
  resolved_at,
  resolved_by,
  resolution_note
`

function mapFeedbackRow(row: Record<string, unknown>): SiteFeedbackRecord {
  return {
    id: String(row.id),
    user_id: row.user_id != null ? String(row.user_id) : null,
    guest_key: row.guest_key != null ? String(row.guest_key) : null,
    message: String(row.message),
    contact: row.contact != null ? String(row.contact) : null,
    status: row.status as SiteFeedbackRecord['status'],
    created_at: String(row.created_at),
    resolved_at: row.resolved_at != null ? String(row.resolved_at) : null,
    resolved_by: row.resolved_by != null ? String(row.resolved_by) : null,
    resolution_note: row.resolution_note != null ? String(row.resolution_note) : null,
  }
}

export async function submitSiteFeedback(
  input: SubmitSiteFeedbackInput,
): Promise<{ feedback?: SiteFeedbackRecord; error?: string }> {
  const session = await getPreviewSession()
  const validated = validateSubmitSiteFeedbackInput(input)
  if (!validated.ok) return { error: validated.error }

  const { message, contact } = validated.data
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  let reporter:
    | { kind: 'user'; userId: string }
    | { kind: 'guest'; guestKey: string }

  if (session.isLoggedIn) {
    reporter = { kind: 'user', userId: session.userId }
  } else {
    try {
      reporter = { kind: 'guest', guestKey: await getOrCreateGuestReporterKey() }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Could not start a guest feedback session.',
      }
    }
  }

  let writeClient
  try {
    writeClient =
      reporter.kind === 'user' ? await createAuthServerClient() : createAdminClient()
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Feedback is temporarily unavailable. Please try again later.',
    }
  }

  const rateQuery =
    reporter.kind === 'user'
      ? writeClient
          .from('site_feedback')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', reporter.userId)
          .gte('created_at', oneHourAgo)
      : writeClient
          .from('site_feedback')
          .select('id', { count: 'exact', head: true })
          .eq('guest_key', reporter.guestKey)
          .gte('created_at', oneHourAgo)

  const { count: recentCount, error: rateError } = await rateQuery
  if (rateError) return { error: rateError.message }
  if ((recentCount ?? 0) >= SITE_FEEDBACK_RATE_LIMIT_PER_HOUR) {
    return {
      error: 'Too much feedback submitted recently. Please try again later.',
    }
  }

  const { data: inserted, error: insertError } = await writeClient
    .from('site_feedback')
    .insert({
      user_id: reporter.kind === 'user' ? reporter.userId : null,
      guest_key: reporter.kind === 'guest' ? reporter.guestKey : null,
      message,
      contact,
      status: 'open',
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
    })
    .select(FEEDBACK_SELECT)
    .single()

  if (insertError) return { error: insertError.message }

  logPostHogInfo('site feedback submitted', {
    action: 'site_feedback_submitted',
    reporter_kind: reporter.kind,
    has_contact: Boolean(contact),
  })

  return { feedback: mapFeedbackRow(inserted as Record<string, unknown>) }
}
