import type { SiteFeedbackStatus } from '@/lib/feedback/constants'

export type SiteFeedbackRecord = {
  id: string
  user_id: string | null
  guest_key: string | null
  message: string
  contact: string | null
  status: SiteFeedbackStatus
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_note: string | null
}

export type SiteFeedbackAdminRow = SiteFeedbackRecord & {
  reporter_display_name: string | null
  resolver_display_name: string | null
}
