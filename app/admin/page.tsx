import Link from 'next/link'
import { AdminMatcher } from '@/components/admin-matcher'
import { createServerReadClient } from '@/lib/supabase-server'
import { normalizeStoreListing } from '@/lib/store-listings'
import type { WineRecord } from '@/lib/wines'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createServerReadClient()

  const [{ data: listings, error: listingsError }, { data: wines, error: winesError }] =
    await Promise.all([
      supabase
        .from('store_listings')
        .select(`
          id,
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
          wines (
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
          vivino_rating
        `)
        .order('producer')
        .order('wine_name'),
    ])

  const error = listingsError ?? winesError
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
        </div>
        <Link href="/" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
          ← Back to tracker
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

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <AdminMatcher
          initialListings={(listings ?? []).map(normalizeStoreListing)}
          initialWines={(wines ?? []) as WineRecord[]}
        />
      </div>
    </main>
  )
}
