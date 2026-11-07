import Link from 'next/link'
import { AdminMatcher } from '@/components/admin-matcher'
import { getOpenReportCounts } from '@/app/admin/report-actions'
import { ADMIN_UNAUTHORIZED_MESSAGE, getSessionUserId, isActorAdmin } from '@/lib/auth/admin'
import { fetchAdminCatalog } from '@/lib/admin-catalog'
import { createServerReadClient } from '@/lib/supabase-server'
import { normalizeStoreListing, normalizeStoreListingImport } from '@/lib/store-listings'

export const dynamic = 'force-dynamic'

type AdminPageProps = {
  searchParams: Promise<{ wine?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { wine } = await searchParams
  const focusWineId = wine?.trim() || null
  if (!(await isActorAdmin())) {
    const sessionUserId = await getSessionUserId()

    return (
      <main style={{ padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Admin</h1>
        <p style={{ color: '#c05050' }}>{ADMIN_UNAUTHORIZED_MESSAGE}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {!sessionUserId ? (
            <Link href="/login?next=/admin" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
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
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

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
          <span style={{ color: '#666', fontSize: 12 }}>Match listings to wines</span>
          <nav style={{ display: 'flex', gap: 10, marginLeft: 8, fontSize: 13 }}>
            <span style={{ color: '#333', fontWeight: 600 }}>Matcher</span>
            <Link href="/admin/pipeline" style={{ color: '#0a7', textDecoration: 'none' }}>
              Pipeline
            </Link>
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

      {!hasServiceRoleKey && (
        <p
          style={{
            margin: 0,
            padding: '8px 10px',
            background: '#fff3cd',
            border: '1px solid #e6c200',
            borderRadius: 4,
            color: '#664d00',
            fontSize: 13,
          }}
        >
          Admin writes need <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>, then a
          full dev-server restart (<code>npm run dev</code>). On Vercel, add the same variable in
          Project Settings → Environment Variables.
        </p>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AdminMatcher
          initialImports={imports.map(normalizeStoreListingImport)}
          initialListings={listings.map(normalizeStoreListing)}
          initialWines={wines}
          focusWineId={focusWineId}
          openReportCountsByWineId={openReportCounts.byWineId}
          openReportCountsByListingId={openReportCounts.byStoreListingId}
        />
      </div>
    </main>
  )
}
