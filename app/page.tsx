import { WineTable, type WineRow } from '@/components/wine-table'
import { supabase } from '../lib/supabase'

export default async function Home() {
  const { data: wines, error } = await supabase
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
      store_listings (
        id,
        current_price_ksh,
        store_product_url,
        in_stock,
        stores (
          id,
          name
        )
      )
    `)
    .limit(50)

  return (
    <main style={{ padding: 20 }}>
      <h1>Wine Tracker (Nairobi)</h1>

      {error && (
        <p style={{ color: 'red' }}>
          Error: {error.message}
        </p>
      )}

      <WineTable wines={(wines ?? []) as WineRow[]} />
    </main>
  )
}
