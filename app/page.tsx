import Link from 'next/link'
import { WineTable, type WineReview, type WineRow } from '@/components/wine-table'
import { createServerReadClient } from '@/lib/supabase-server'
import { getCurrentUserId } from '@/lib/user'

export const dynamic = 'force-dynamic'

type UserReview = {
  id: string
  wine_id: string
  overall_score: number | null
  value_score: number | null
  want_to_try: boolean | null
  tried: boolean | null
  would_buy_again: boolean | null
  tasting_notes: string | null
  tasted_on: string | null
}

function attachReviews(wines: WineRow[], reviews: UserReview[]): WineRow[] {
  const reviewsByWineId = new Map(
    reviews.map((review) => [review.wine_id, review]),
  )

  return wines.map((wine) => {
    const review = reviewsByWineId.get(String(wine.id))
    if (!review) return wine

    return {
      ...wine,
      review: {
        id: review.id,
        overall_score: review.overall_score,
        value_score: review.value_score,
        want_to_try: review.want_to_try,
        tried: review.tried,
        would_buy_again: review.would_buy_again,
        tasting_notes: review.tasting_notes,
        tasted_on: review.tasted_on,
      } satisfies WineReview,
    }
  })
}

export default async function Home() {
  const userId = getCurrentUserId()
  const supabase = createServerReadClient()

  const [
    { data: profile, error: profileError },
    { data: wines, error: winesError },
    { data: reviews, error: reviewsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', userId)
      .maybeSingle(),
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
      .order('producer')
      .order('wine_name'),
    supabase
      .from('reviews')
      .select(`
        id,
        wine_id,
        overall_score,
        value_score,
        want_to_try,
        tried,
        would_buy_again,
        tasting_notes,
        tasted_on
      `)
      .eq('user_id', userId),
  ])

  const error = profileError ?? winesError ?? reviewsError
  const userName = profile?.display_name ?? profile?.username ?? 'Unknown user'

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Wine Tracker (Nairobi)</h1>
        <Link href="/admin" style={{ color: '#0a7', textDecoration: 'none', fontSize: 14 }}>
          Admin →
        </Link>
      </div>
      <p style={{ marginTop: 8, marginBottom: 0, color: '#444' }}>
        Signed in as <strong>{userName}</strong>
      </p>

      {error && (
        <p style={{ color: 'red' }}>
          Error: {error.message}
        </p>
      )}

      <WineTable
        userId={userId}
        wines={attachReviews((wines ?? []) as WineRow[], (reviews ?? []) as UserReview[])}
      />
    </main>
  )
}
