import Link from 'next/link'
import { AdminPipelinePanel } from '@/components/admin-pipeline-panel'
import { getOpenReportCounts } from '@/app/admin/report-actions'
import { ADMIN_UNAUTHORIZED_MESSAGE, getSessionUserId, isActorAdmin } from '@/lib/auth/admin'
import { toPipelineLineageSnapshot } from '@/lib/pipeline-lineage'
import { createServerReadClient } from '@/lib/supabase-server'
import { normalizeStoreListing, normalizeStoreListingImport } from '@/lib/store-listings'
import type { WineRecord } from '@/lib/wines'

export const dynamic = 'force-dynamic'

export default async function AdminPipelinePage() {
  if (!(await isActorAdmin())) {
    const sessionUserId = await getSessionUserId()

    return (
      <main style={{ padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Admin · Pipeline</h1>
        <p style={{ color: '#c05050' }}>{ADMIN_UNAUTHORIZED_MESSAGE}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {!sessionUserId ? (
            <Link
              href="/login?next=/admin/pipeline"
              style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}
            >
              Log in →
            </Link>
          ) : null}
          <Link href="/" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
            ← Back to wine list
          </Link>
        </div>
      </main>
    )
  }

  const supabase = createServerReadClient()

  const [
    { data: imports, error: importsError },
    { data: listings, error: listingsError },
    { data: wines, error: winesError },
    openReportCounts,
  ] = await Promise.all([
    supabase
      .from('store_listings_imports')
      .select(`
          id,
          store_id,
          raw_title,
          store_product_url,
          image_url,
          current_price_ksh,
          in_stock,
          producer,
          vintage,
          country,
          region,
          style,
          grape_varieties,
          status,
          matched_store_listing_id,
          stores (
            id,
            name
          )
        `)
      .order('raw_title'),
    supabase
      .from('store_listings')
      .select(`
          id,
          store_id,
          raw_title,
          store_product_url,
          image_url,
          current_price_ksh,
          wine_id,
          in_stock,
          producer,
          vintage,
          country,
          region,
          style,
          grape_varieties,
          stores (
            id,
            name
          ),
          wines!wine_id (
            id,
            producer,
            wine_name,
            vintage
          )
        `)
      .order('raw_title'),
    supabase
      .from('wines')
      .select(`
          id,
          producer,
          wine_name,
          vintage,
          country,
          region,
          grape_varieties,
          style,
          vivino_url,
          vivino_rating,
          vivino_match_confidence,
          hosted_image_path,
          image_migration_status,
          image_source_listing_id,
          show_on_site
        `)
      .order('producer')
      .order('wine_name'),
    getOpenReportCounts(),
  ])

  const error = importsError ?? listingsError ?? winesError
  const snapshot = toPipelineLineageSnapshot(
    (imports ?? []).map(normalizeStoreListingImport),
    (listings ?? []).map(normalizeStoreListing),
    (wines ?? []) as WineRecord[],
  )

  return (
    <main
      style={{
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Admin</h1>
          <span style={{ color: '#666', fontSize: 12 }}>Import → shop → canonical lineage</span>
          <nav style={{ display: 'flex', gap: 10, marginLeft: 8, fontSize: 13 }}>
            <Link href="/admin" style={{ color: '#0a7', textDecoration: 'none' }}>
              Matcher
            </Link>
            <span style={{ color: '#333', fontWeight: 600 }}>Pipeline</span>
            <Link href="/admin/reports" style={{ color: '#0a7', textDecoration: 'none' }}>
              Reports
              {(openReportCounts.totalOpen ?? 0) > 0 ? (
                <span style={{ marginLeft: 4, color: '#b45309', fontWeight: 600 }}>
                  ({openReportCounts.totalOpen})
                </span>
              ) : null}
            </Link>
            <Link href="/admin/feedback" style={{ color: '#0a7', textDecoration: 'none' }}>
              Feedback
            </Link>
          </nav>
        </div>
        <Link href="/" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
          ← Back to wine list
        </Link>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AdminPipelinePanel snapshot={snapshot} />
      </div>
    </main>
  )
}
