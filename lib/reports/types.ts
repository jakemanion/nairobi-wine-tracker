import type { WineReportIssueType, WineReportStatus } from '@/lib/reports/constants'

export type WineReportListingSnapshot = {
  producer: string | null
  wine_name: string | null
  vintage: string | null
  vivino_rating: number | string | null
  store_name: string | null
  listed_price_ksh: number | string | null
  store_listing_id: string | null
  listings?: Array<{
    id: string
    store_name: string | null
    price_ksh: number | string | null
  }>
}

export type WineReportRecord = {
  id: string
  wine_id: string | null
  store_listing_id: string | null
  user_id: string
  issue_type: WineReportIssueType
  description: string | null
  status: WineReportStatus
  listing_snapshot: WineReportListingSnapshot | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_note: string | null
}

export type WineReportAdminRow = WineReportRecord & {
  reporter_display_name: string | null
  reporter_email: string | null
  wine_producer: string | null
  wine_name: string | null
  wine_vintage: string | number | null
  store_name: string | null
  listing_raw_title: string | null
  listing_price_ksh: number | string | null
  resolver_display_name: string | null
}

export type OpenReportCounts = {
  byWineId: Record<string, number>
  byStoreListingId: Record<string, number>
}
