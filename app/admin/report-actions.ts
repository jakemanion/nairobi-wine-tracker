'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAccess, getSessionUserId, ADMIN_UNAUTHORIZED_MESSAGE } from '@/lib/auth/admin'
import { type WineReportIssueType } from '@/lib/reports/constants'
import type {
  OpenReportCounts,
  WineReportAdminRow,
  WineReportListingSnapshot,
  WineReportRecord,
} from '@/lib/reports/types'
import { isUuid, isWineReportIssueType, normalizeResolutionNote } from '@/lib/reports/validation'
import { createAdminClient } from '@/lib/supabase-admin'

const REPORT_SELECT = `
  id,
  wine_id,
  store_listing_id,
  user_id,
  issue_type,
  description,
  status,
  listing_snapshot,
  created_at,
  resolved_at,
  resolved_by,
  resolution_note
`

function mapReport(row: Record<string, unknown>): WineReportRecord {
  return {
    id: String(row.id),
    wine_id: row.wine_id != null ? String(row.wine_id) : null,
    store_listing_id: row.store_listing_id != null ? String(row.store_listing_id) : null,
    user_id: String(row.user_id),
    issue_type: row.issue_type as WineReportRecord['issue_type'],
    description: row.description != null ? String(row.description) : null,
    status: row.status as WineReportRecord['status'],
    listing_snapshot: (row.listing_snapshot as WineReportListingSnapshot | null) ?? null,
    created_at: String(row.created_at),
    resolved_at: row.resolved_at != null ? String(row.resolved_at) : null,
    resolved_by: row.resolved_by != null ? String(row.resolved_by) : null,
    resolution_note: row.resolution_note != null ? String(row.resolution_note) : null,
  }
}

export type ListAdminWineReportsFilters = {
  status?: 'open' | 'resolved' | 'all'
  issueType?: WineReportIssueType | 'all'
  storeId?: string | 'all'
  page?: number
  pageSize?: number
}

export async function listAdminWineReports(
  filters: ListAdminWineReportsFilters = {},
): Promise<{
  reports: WineReportAdminRow[]
  total: number
  page: number
  pageSize: number
  error?: string
}> {
  const access = await requireAdminAccess()
  if (!access.ok) {
    return { reports: [], total: 0, page: 1, pageSize: 25, error: access.error }
  }

  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100)
  const page = Math.max(filters.page ?? 1, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const status = filters.status ?? 'open'
  const issueType = filters.issueType ?? 'all'
  const storeId = filters.storeId ?? 'all'

    try {
    const supabase = createAdminClient()

    let listingIdsForStore: string[] | null = null
    if (storeId !== 'all' && isUuid(storeId)) {
      const { data: storeListings, error: storeListingsError } = await supabase
        .from('store_listings')
        .select('id')
        .eq('store_id', storeId)
      if (storeListingsError) {
        return { reports: [], total: 0, page, pageSize, error: storeListingsError.message }
      }
      listingIdsForStore = (storeListings ?? []).map((row) => String(row.id))
      if (listingIdsForStore.length === 0) {
        return { reports: [], total: 0, page, pageSize }
      }
    }

    let query = supabase
      .from('wine_reports')
      .select(REPORT_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status === 'open' || status === 'resolved') {
      query = query.eq('status', status)
    }

    if (issueType !== 'all' && isWineReportIssueType(issueType)) {
      query = query.eq('issue_type', issueType)
    }

    if (listingIdsForStore) {
      query = query.in('store_listing_id', listingIdsForStore)
    }

    const { data, error, count } = await query
    if (error) {
      return { reports: [], total: 0, page, pageSize, error: error.message }
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
    const wineIds = [
      ...new Set(rows.map((row) => (row.wine_id ? String(row.wine_id) : null)).filter(Boolean)),
    ] as string[]
    const listingIds = [
      ...new Set(
        rows
          .map((row) => (row.store_listing_id ? String(row.store_listing_id) : null))
          .filter(Boolean),
      ),
    ] as string[]

    const [profilesResult, winesResult, listingsResult] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, display_name, username').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
      wineIds.length
        ? supabase
            .from('wines')
            .select('id, producer, wine_name, vintage')
            .in('id', wineIds)
        : Promise.resolve({ data: [], error: null }),
      listingIds.length
        ? supabase
            .from('store_listings')
            .select(
              `
                id,
                raw_title,
                current_price_ksh,
                store_id,
                stores (
                  id,
                  name
                )
              `,
            )
            .in('id', listingIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const profilesById = new Map(
      (profilesResult.data ?? []).map((p) => [
        String(p.id),
        {
          display_name: p.display_name != null ? String(p.display_name) : null,
          username: p.username != null ? String(p.username) : null,
        },
      ]),
    )
    const winesById = new Map(
      (winesResult.data ?? []).map((w) => [
        String(w.id),
        {
          producer: w.producer != null ? String(w.producer) : null,
          wine_name: w.wine_name != null ? String(w.wine_name) : null,
          vintage: w.vintage ?? null,
        },
      ]),
    )
    const listingsById = new Map(
      (listingsResult.data ?? []).map((l) => {
        const stores = l.stores as { id?: string; name?: string | null } | null
        return [
          String(l.id),
          {
            raw_title: l.raw_title != null ? String(l.raw_title) : null,
            price: l.current_price_ksh ?? null,
            store_id: l.store_id != null ? String(l.store_id) : null,
            store_name: stores?.name?.trim() || null,
          },
        ]
      }),
    )

    const reports: WineReportAdminRow[] = rows.map((row) => {
      const base = mapReport(row)
      const profile = profilesById.get(base.user_id)
      const resolver = base.resolved_by ? profilesById.get(base.resolved_by) : null
      const wine = base.wine_id ? winesById.get(base.wine_id) : null
      const listing = base.store_listing_id ? listingsById.get(base.store_listing_id) : null
      const snapshot = base.listing_snapshot

      return {
        ...base,
        reporter_display_name: profile?.display_name ?? profile?.username ?? null,
        reporter_email: null,
        wine_producer: wine?.producer ?? snapshot?.producer ?? null,
        wine_name: wine?.wine_name ?? snapshot?.wine_name ?? null,
        wine_vintage: wine?.vintage ?? snapshot?.vintage ?? null,
        store_name: listing?.store_name ?? snapshot?.store_name ?? null,
        listing_raw_title: listing?.raw_title ?? null,
        listing_price_ksh: listing?.price ?? snapshot?.listed_price_ksh ?? null,
        resolver_display_name: resolver?.display_name ?? resolver?.username ?? null,
      }
    })

    return {
      reports,
      total: count ?? reports.length,
      page,
      pageSize,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load reports.'
    return { reports: [], total: 0, page, pageSize, error: message }
  }
}

export async function getAdminWineReport(
  reportId: string,
): Promise<{ report?: WineReportAdminRow; error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }
  if (!isUuid(reportId)) return { error: 'Invalid report id.' }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('wine_reports')
      .select(REPORT_SELECT)
      .eq('id', reportId)
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: 'Report not found.' }

    const base = mapReport(data as Record<string, unknown>)
    const [profileResult, wineResult, listingResult, resolverResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, username')
        .eq('id', base.user_id)
        .maybeSingle(),
      base.wine_id
        ? supabase
            .from('wines')
            .select('id, producer, wine_name, vintage')
            .eq('id', base.wine_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      base.store_listing_id
        ? supabase
            .from('store_listings')
            .select(
              `
                id,
                raw_title,
                current_price_ksh,
                stores ( id, name )
              `,
            )
            .eq('id', base.store_listing_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      base.resolved_by
        ? supabase
            .from('profiles')
            .select('id, display_name, username')
            .eq('id', base.resolved_by)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const stores = listingResult.data?.stores as { name?: string | null } | null
    const snapshot = base.listing_snapshot

    return {
      report: {
        ...base,
        reporter_display_name:
          profileResult.data?.display_name != null
            ? String(profileResult.data.display_name)
            : profileResult.data?.username != null
              ? String(profileResult.data.username)
              : null,
        reporter_email: null,
        wine_producer:
          wineResult.data?.producer != null
            ? String(wineResult.data.producer)
            : (snapshot?.producer ?? null),
        wine_name:
          wineResult.data?.wine_name != null
            ? String(wineResult.data.wine_name)
            : (snapshot?.wine_name ?? null),
        wine_vintage: wineResult.data?.vintage ?? snapshot?.vintage ?? null,
        store_name: stores?.name?.trim() || snapshot?.store_name || null,
        listing_raw_title:
          listingResult.data?.raw_title != null ? String(listingResult.data.raw_title) : null,
        listing_price_ksh: listingResult.data?.current_price_ksh ?? snapshot?.listed_price_ksh ?? null,
        resolver_display_name:
          resolverResult.data?.display_name != null
            ? String(resolverResult.data.display_name)
            : resolverResult.data?.username != null
              ? String(resolverResult.data.username)
              : null,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load report.' }
  }
}

export async function resolveWineReport(input: {
  reportId: string
  resolutionNote?: string | null
}): Promise<{ report?: WineReportRecord; error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }

  const adminId = await getSessionUserId()
  if (!adminId) return { error: ADMIN_UNAUTHORIZED_MESSAGE }

  if (!isUuid(input.reportId)) return { error: 'Invalid report id.' }

  const noteResult = normalizeResolutionNote(input.resolutionNote)
  if (!noteResult.ok) return { error: noteResult.error }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('wine_reports')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
        resolution_note: noteResult.note,
      })
      .eq('id', input.reportId)
      .select(REPORT_SELECT)
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: 'Report not found.' }

    revalidatePath('/admin')
    revalidatePath('/admin/reports')
    return { report: mapReport(data as Record<string, unknown>) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to resolve report.' }
  }
}

export async function reopenWineReport(input: {
  reportId: string
}): Promise<{ report?: WineReportRecord; error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }
  if (!isUuid(input.reportId)) return { error: 'Invalid report id.' }

  try {
    const supabase = createAdminClient()
    // Clear active resolution metadata; resolution_note is retained as history.
    const { data, error } = await supabase
      .from('wine_reports')
      .update({
        status: 'open',
        resolved_at: null,
        resolved_by: null,
      })
      .eq('id', input.reportId)
      .select(REPORT_SELECT)
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: 'Report not found.' }

    revalidatePath('/admin')
    revalidatePath('/admin/reports')
    return { report: mapReport(data as Record<string, unknown>) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reopen report.' }
  }
}

export async function deleteWineReport(input: {
  reportId: string
}): Promise<{ ok?: true; error?: string }> {
  const access = await requireAdminAccess()
  if (!access.ok) return { error: access.error }
  if (!isUuid(input.reportId)) return { error: 'Invalid report id.' }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('wine_reports').delete().eq('id', input.reportId)
    if (error) return { error: error.message }

    revalidatePath('/admin')
    revalidatePath('/admin/reports')
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete report.' }
  }
}

/** Open-report counts for admin wine / listing flag indicators. */
export async function getOpenReportCounts(): Promise<
  OpenReportCounts & { totalOpen?: number; error?: string }
> {
  const access = await requireAdminAccess()
  if (!access.ok) {
    return { byWineId: {}, byStoreListingId: {}, totalOpen: 0, error: access.error }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('wine_reports')
      .select('wine_id, store_listing_id')
      .eq('status', 'open')

    if (error) {
      return { byWineId: {}, byStoreListingId: {}, totalOpen: 0, error: error.message }
    }

    const byWineId: Record<string, number> = {}
    const byStoreListingId: Record<string, number> = {}
    let totalOpen = 0

    for (const row of data ?? []) {
      totalOpen += 1
      if (row.wine_id) {
        const id = String(row.wine_id)
        byWineId[id] = (byWineId[id] ?? 0) + 1
      }
      if (row.store_listing_id) {
        const id = String(row.store_listing_id)
        byStoreListingId[id] = (byStoreListingId[id] ?? 0) + 1
      }
    }

    return { byWineId, byStoreListingId, totalOpen }
  } catch (err) {
    return {
      byWineId: {},
      byStoreListingId: {},
      totalOpen: 0,
      error: err instanceof Error ? err.message : 'Failed to load report counts.',
    }
  }
}

export async function listAdminStoresForFilter(): Promise<{
  stores: Array<{ id: string; name: string }>
  error?: string
}> {
  const access = await requireAdminAccess()
  if (!access.ok) return { stores: [], error: access.error }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('stores').select('id, name').order('name')
    if (error) return { stores: [], error: error.message }
    return {
      stores: (data ?? []).map((s) => ({
        id: String(s.id),
        name: String(s.name ?? 'Unknown store'),
      })),
    }
  } catch (err) {
    return {
      stores: [],
      error: err instanceof Error ? err.message : 'Failed to load stores.',
    }
  }
}
