import Link from 'next/link'
import { AdminReportsPanel } from '@/components/admin-reports-panel'
import { ADMIN_UNAUTHORIZED_MESSAGE, getSessionUserId, isActorAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  if (!(await isActorAdmin())) {
    const sessionUserId = await getSessionUserId()

    return (
      <main style={{ padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Admin · Reports</h1>
        <p style={{ color: '#c05050' }}>{ADMIN_UNAUTHORIZED_MESSAGE}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {!sessionUserId ? (
            <Link href="/login?next=/admin/reports" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
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
          <span style={{ color: '#666', fontSize: 12 }}>Reports</span>
          <nav style={{ display: 'flex', gap: 10, marginLeft: 8, fontSize: 13 }}>
            <Link href="/admin" style={{ color: '#0a7', textDecoration: 'none' }}>
              Matcher
            </Link>
            <span style={{ color: '#333', fontWeight: 600 }}>Reports</span>
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
          Admin writes need <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>.
        </p>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AdminReportsPanel />
      </div>
    </main>
  )
}
