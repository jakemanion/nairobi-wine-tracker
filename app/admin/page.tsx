import Link from 'next/link'
import { AdminMatcher } from '@/components/admin-matcher'
import { supabase } from '@/lib/supabase'
import { normalizeStoreListing } from '@/lib/store-listings'
import type { WineRecord } from '@/lib/wines'

export default async function AdminPage() {
  const [{ data: listings, error: listingsError }, { data: wines, error: winesError }] =
    await Promise.all([
      supabase
        .from('store_listings')
        .select(`
          id,
          raw_title,
          store_product_url,
          current_price_ksh,
          wine_id,
          in_stock,
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

  return (
    <main style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin — Wine matching</h1>
          <p style={{ margin: '8px 0 0', color: '#555' }}>
            Match store listings to canonical wines and edit all fields inline.
          </p>
        </div>
        <Link href="/" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
          ← Back to tracker
        </Link>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      <AdminMatcher
        initialListings={(listings ?? []).map(normalizeStoreListing)}
        initialWines={(wines ?? []) as WineRecord[]}
      />
    </main>
  )
}
