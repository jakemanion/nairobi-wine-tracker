'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAccess, getSessionUserId, ADMIN_UNAUTHORIZED_MESSAGE } from '@/lib/auth/admin'
import type { SiteFeedbackAdminRow, SiteFeedbackRecord } from '@/lib/feedback/types'
import { isUuid, normalizeResolutionNote } from '@/lib/feedback/validation'
import { createAdminClient } from '@/lib/supabase-admin'
import { logPostHogInfo } from '@/lib/posthog-logs'

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

function mapFeedback(row: Record<string, unknown>): SiteFeedbackRecord {
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

function reporterLabel(
  profile: { display_name: string | null; username: string | null } | null | undefined,
  userId: string | null,
): string | null {
  if (profile?.display_name) return profile.display_name
  if (profile?.username) return profile.username
  if (!userId) return 'Guest'
  return null
}

export type ListAdminSiteFeedbackFilters = {
  status?: 'open' | 'resolved' | 'all'
  page?: number
  pageSize?: number
}

export async function listAdminSiteFeedback(
  filters: ListAdminSiteFeedbackFilters = {},
): Promise<{
  feedback: SiteFeedbackAdminRow[]
  total: number
  page: number
  pageSize: number
  error?: string
}> {
  const access = await requireAdminAccess()
  if (!access.ok) {
    return { feedback: [], total: 0, page: 1, pageSize: 25, error: access.error }
  }

  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100)
  const page = Math.max(filters.page ?? 1, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const status = filters.status ?? 'open'

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('site_feedback')
      .select(FEEDBACK_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status === 'open' || status === 'resolved') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query
    if (error) {
      return { feedback: [], total: 0, page, pageSize, error: error.message }
    }

    const rows = (data ?? []) as Record<string, unknown>[]
    const userIds = [
      ...new Set(
        rows.flatMap((row) => {
          const ids: string[] = []
          if (row.user_id) ids.push(String(row.user_id))
          if (row.resolved_by) ids.push(String(row.resolved_by))
          return ids
        }),
      ),
    ]

    const profilesResult = userIds.length
      ? await supabase.from('profiles').select('id, display_name, username').in('id', userIds)
      : { data: [], error: null }

    const profilesById = new Map(
      (profilesResult.data ?? []).map((p) => [
        String(p.id),
        {
          display_name: p.display_name != null ? String(p.display_name) : null,
          username: p.username != null ? String(p.username) : null,
        },
      ]),
    )

    const feedback: SiteFeedbackAdminRow[] = rows.map((row) => {
      const base = mapFeedback(row)
      const profile = base.user_id ? profilesById.get(base.user_id) : null
      const resolver = base.resolved_by ? profilesById.get(base.resolved_by) : null

      return {
        ...base,
        reporter_display_name: reporterLabel(profile, base.user_id),
        resolver_display_name: resolver?.display_name ?? resolver?.username ?? null,
      }
    })

    return {
      feedback,
      total: count ?? feedback.length,
      page,
      pageSize,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load feedback.'
    return { feedback: [], total: 0, page, pageSize, error: message }
  }
}

export async function resolveSiteFeedback(input: {
  feedbackId: string
  resolutionNote?: string | null
}): Promise<{ feedback?: SiteFeedbackRecord; error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const adminId = await getSessionUserId()
  if (!adminId) return { error: ADMIN_UNAUTHORIZED_MESSAGE }

  if (!isUuid(input.feedbackId)) return { error: 'Invalid feedback id.' }

  const noteResult = normalizeResolutionNote(input.resolutionNote)
  if (!noteResult.ok) return { error: noteResult.error }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('site_feedback')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
        resolution_note: noteResult.note,
      })
      .eq('id', input.feedbackId)
      .select(FEEDBACK_SELECT)
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: 'Feedback not found.' }

    revalidatePath('/admin/feedback')
    logPostHogInfo('site feedback resolved', { action: 'site_feedback_resolved' })
    return { feedback: mapFeedback(data as Record<string, unknown>) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to resolve feedback.' }
  }
}

export async function reopenSiteFeedback(input: {
  feedbackId: string
}): Promise<{ feedback?: SiteFeedbackRecord; error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }
  if (!isUuid(input.feedbackId)) return { error: 'Invalid feedback id.' }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('site_feedback')
      .update({
        status: 'open',
        resolved_at: null,
        resolved_by: null,
      })
      .eq('id', input.feedbackId)
      .select(FEEDBACK_SELECT)
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: 'Feedback not found.' }

    revalidatePath('/admin/feedback')
    logPostHogInfo('site feedback reopened', { action: 'site_feedback_reopened' })
    return { feedback: mapFeedback(data as Record<string, unknown>) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reopen feedback.' }
  }
}

export async function deleteSiteFeedback(input: {
  feedbackId: string
}): Promise<{ ok?: true; error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }
  if (!isUuid(input.feedbackId)) return { error: 'Invalid feedback id.' }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('site_feedback').delete().eq('id', input.feedbackId)
    if (error) return { error: error.message }

    revalidatePath('/admin/feedback')
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete feedback.' }
  }
}

export async function getOpenSiteFeedbackCount(): Promise<{
  totalOpen: number
  error?: string
}> {
  const access = await requireAdminAccess()
  if (!access.ok) return { totalOpen: 0, error: access.error }

  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('site_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')

    if (error) return { totalOpen: 0, error: error.message }
    return { totalOpen: count ?? 0 }
  } catch (err) {
    return {
      totalOpen: 0,
      error: err instanceof Error ? err.message : 'Failed to load feedback count.',
    }
  }
}
