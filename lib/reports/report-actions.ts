'use server'

import { getPreviewSession } from '@/lib/auth/preview-session'
import { WINE_REPORT_RATE_LIMIT_PER_HOUR } from '@/lib/reports/constants'
import { getGuestReporterKey, getOrCreateGuestReporterKey } from '@/lib/reports/guest-reporter'
import type { WineReportListingSnapshot, WineReportRecord } from '@/lib/reports/types'
import {
  validateSubmitWineReportInput,
  type SubmitWineReportInput,
} from '@/lib/reports/validation'
import { createAdminClient } from '@/lib/supabase-admin'
import { logPostHogInfo } from '@/lib/posthog-logs'
import { createAuthServerClient } from '@/lib/supabase-auth-server'
import { createServerReadClient } from '@/lib/supabase-server'

const REPORT_SELECT = `
  id,
  wine_id,
  store_listing_id,
  user_id,
  guest_key,
  issue_type,
  description,
  status,
  listing_snapshot,
  created_at,
  resolved_at,
  resolved_by,
  resolution_note
`

function mapReportRow(row: Record<string, unknown>): WineReportRecord {
  return {
    id: String(row.id),
    wine_id: row.wine_id != null ? String(row.wine_id) : null,
    store_listing_id: row.store_listing_id != null ? String(row.store_listing_id) : null,
    user_id: row.user_id != null ? String(row.user_id) : null,
    guest_key: row.guest_key != null ? String(row.guest_key) : null,
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

/**
 * Wine IDs the current user or guest already has an open report against.
 * Used to show "Report submitted" on cards without exposing other users' data.
 */
export async function getMyOpenReportedWineIds(): Promise<{
  wineIds: string[]
  error?: string
}> {
  const session = await getPreviewSession()

  if (session.isLoggedIn) {
    const supabase = await createAuthServerClient()
    const { data, error } = await supabase
      .from('wine_reports')
      .select('wine_id')
      .eq('user_id', session.userId)
      .eq('status', 'open')
      .not('wine_id', 'is', null)

    if (error) return { wineIds: [], error: error.message }

    return {
      wineIds: [
        ...new Set(
          (data ?? [])
            .map((row) => (row.wine_id != null ? String(row.wine_id) : null))
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    }
  }

  const guestKey = await getGuestReporterKey()
  if (!guestKey) return { wineIds: [] }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('wine_reports')
      .select('wine_id')
      .eq('guest_key', guestKey)
      .eq('status', 'open')
      .not('wine_id', 'is', null)

    if (error) return { wineIds: [], error: error.message }

    return {
      wineIds: [
        ...new Set(
          (data ?? [])
            .map((row) => (row.wine_id != null ? String(row.wine_id) : null))
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    }
  } catch (err) {
    return {
      wineIds: [],
      error: err instanceof Error ? err.message : 'Failed to load guest reports.',
    }
  }
}

export async function submitWineReport(
  input: SubmitWineReportInput,
): Promise<{ report?: WineReportRecord; error?: string }> {
  const session = await getPreviewSession()
  const validated = validateSubmitWineReportInput(input)
  if (!validated.ok) return { error: validated.error }

  const { wineId, storeListingId, issueType, description } = validated.data
  const readClient = createServerReadClient()

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
        error: err instanceof Error ? err.message : 'Could not start a guest report session.',
      }
    }
  }

  // Logged-in inserts use the auth client (RLS). Guests use service role.
  let writeClient
  try {
    writeClient =
      reporter.kind === 'user' ? await createAuthServerClient() : createAdminClient()
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : 'Reporting is temporarily unavailable. Please try again later.',
    }
  }

  const rateQuery =
    reporter.kind === 'user'
      ? writeClient
          .from('wine_reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', reporter.userId)
          .gte('created_at', oneHourAgo)
      : writeClient
          .from('wine_reports')
          .select('id', { count: 'exact', head: true })
          .eq('guest_key', reporter.guestKey)
          .gte('created_at', oneHourAgo)

  const { count: recentCount, error: rateError } = await rateQuery
  if (rateError) return { error: rateError.message }
  if ((recentCount ?? 0) >= WINE_REPORT_RATE_LIMIT_PER_HOUR) {
    return {
      error: 'Too many reports submitted recently. Please try again later.',
    }
  }

  const { data: wine, error: wineError } = await readClient
    .from('wines')
    .select('id, producer, wine_name, vintage, vivino_rating')
    .eq('id', wineId)
    .maybeSingle()

  if (wineError) return { error: wineError.message }
  if (!wine) return { error: 'That wine could not be found.' }

  let storeName: string | null = null
  let listedPrice: number | string | null = null
  let resolvedListingId: string | null = storeListingId

  if (storeListingId) {
    const { data: listing, error: listingError } = await readClient
      .from('store_listings')
      .select(
        `
          id,
          wine_id,
          current_price_ksh,
          stores (
            id,
            name
          )
        `,
      )
      .eq('id', storeListingId)
      .maybeSingle()

    if (listingError) return { error: listingError.message }
    if (!listing) return { error: 'That store listing could not be found.' }
    if (listing.wine_id == null || String(listing.wine_id) !== wineId) {
      return { error: 'That store listing does not belong to this wine.' }
    }

    const stores = listing.stores as { id?: string; name?: string | null } | null
    storeName = stores?.name?.trim() || null
    listedPrice = listing.current_price_ksh ?? null
  }

  const { data: allListings } = await readClient
    .from('store_listings')
    .select(
      `
        id,
        current_price_ksh,
        stores (
          name
        )
      `,
    )
    .eq('wine_id', wineId)
    .limit(30)

  const snapshotListings = (allListings ?? []).map((row) => {
    const stores = row.stores as { name?: string | null } | null
    return {
      id: String(row.id),
      store_name: stores?.name?.trim() || null,
      price_ksh: row.current_price_ksh ?? null,
    }
  })

  if (!storeListingId && snapshotListings.length === 1) {
    resolvedListingId = snapshotListings[0].id
    storeName = snapshotListings[0].store_name
    listedPrice = snapshotListings[0].price_ksh
  }

  const listing_snapshot: WineReportListingSnapshot = {
    producer: wine.producer ?? null,
    wine_name: wine.wine_name ?? null,
    vintage: wine.vintage != null ? String(wine.vintage) : null,
    vivino_rating: wine.vivino_rating ?? null,
    store_name: storeName,
    listed_price_ksh: listedPrice,
    store_listing_id: resolvedListingId,
    listings: snapshotListings,
  }

  const existingQuery =
    reporter.kind === 'user'
      ? writeClient
          .from('wine_reports')
          .select('id')
          .eq('user_id', reporter.userId)
          .eq('wine_id', wineId)
          .eq('status', 'open')
          .maybeSingle()
      : writeClient
          .from('wine_reports')
          .select('id')
          .eq('guest_key', reporter.guestKey)
          .eq('wine_id', wineId)
          .eq('status', 'open')
          .maybeSingle()

  const { data: existingOpen } = await existingQuery

  if (existingOpen) {
    return {
      error: 'You already have an open report for this wine. Thanks for helping!',
    }
  }

  const { data: inserted, error: insertError } = await writeClient
    .from('wine_reports')
    .insert({
      wine_id: wineId,
      store_listing_id: resolvedListingId,
      user_id: reporter.kind === 'user' ? reporter.userId : null,
      guest_key: reporter.kind === 'guest' ? reporter.guestKey : null,
      issue_type: issueType,
      description,
      status: 'open',
      listing_snapshot,
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
    })
    .select(REPORT_SELECT)
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        error: 'You already have an open report for this wine. Thanks for helping!',
      }
    }
    return { error: insertError.message }
  }

  logPostHogInfo('wine report submitted', {
    action: 'wine_report_submitted',
    issue_type: issueType,
    reporter_kind: reporter.kind,
    has_store_listing: Boolean(resolvedListingId),
  })
  return { report: mapReportRow(inserted as Record<string, unknown>) }
}
