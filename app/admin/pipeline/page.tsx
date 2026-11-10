import Link from 'next/link'
import { AdminPipelinePanel } from '@/components/admin-pipeline-panel'
import { getOpenReportCounts } from '@/app/admin/report-actions'
import { ADMIN_UNAUTHORIZED_MESSAGE, getSessionUserId, isActorAdmin } from '@/lib/auth/admin'
import { fetchAdminCatalog } from '@/lib/admin-catalog'
import { toPipelineLineageSnapshot } from '@/lib/pipeline-lineage'
import { createServerReadClient } from '@/lib/supabase-server'
import { normalizeStoreListing, normalizeStoreListingImport } from '@/lib/store-listings'

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

  const [catalog, openReportCounts] = await Promise.all([
    fetchAdminCatalog(supabase),
    getOpenReportCounts(),
  ])

  const { imports, listings, wines, error } = catalog
  const snapshot = toPipelineLineageSnapshot(
    imports.map(normalizeStoreListingImport),
    listings.map(normalizeStoreListing),
    wines,
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
            <Link href="/admin/ratings" style={{ color: '#0a7', textDecoration: 'none' }}>
              Ratings
            </Link>
          </nav>
        </div>
        <Link href="/" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
          ← Back to wine list
        </Link>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AdminPipelinePanel snapshot={snapshot} />
      </div>
    </main>
  )
}
