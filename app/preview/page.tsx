import Link from 'next/link'
import { PreviewWineList } from '@/components/preview/preview-wine-list'
import { PreviewThemeProvider } from '@/components/preview/preview-theme-context'
import type { WineReview, WineRow } from '@/components/wine-table'
import { createServerReadClient } from '@/lib/supabase-server'
import { getCurrentUserId } from '@/lib/user'

export const dynamic = 'force-dynamic'

type UserReview = {
  id: string
  wine_id: string
  overall_score: number | null
  value_score: number | null
  wishlist: number | null
  tried_status: number | null
  want_to_try: boolean | null
  tasting_notes: string | null
  tasted_on: string | null
}

function attachReviews(wines: WineRow[], reviews: UserReview[]): WineRow[] {
  const reviewsByWineId = new Map(reviews.map((review) => [review.wine_id, review]))

  return wines.map((wine) => {
    const review = reviewsByWineId.get(String(wine.id))
    if (!review) return wine

    return {
      ...wine,
      review: {
        id: review.id,
        overall_score: review.overall_score,
        value_score: review.value_score,
        wishlist: review.wishlist,
        tried_status: review.tried_status,
        want_to_try: review.want_to_try,
        tasting_notes: review.tasting_notes,
        tasted_on: review.tasted_on,
      } satisfies WineReview,
    }
  })
}

export default async function PreviewPage() {
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
          image_url,
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
        wishlist,
        tried_status,
        want_to_try,
        tasting_notes,
        tasted_on
      `)
      .eq('user_id', userId),
  ])

  const error = profileError ?? winesError ?? reviewsError
  const userName = profile?.display_name ?? profile?.username ?? 'Unknown user'

  if (error) {
    return (
      <main className="p-6">
        <p style={{ color: '#c05050' }}>Error: {error.message}</p>
        <Link href="/" style={{ color: '#C93048' }}>
          Back to classic view
        </Link>
      </main>
    )
  }

  return (
    <PreviewThemeProvider>
      <PreviewWineList
        userId={userId}
        userName={userName}
        wines={attachReviews((wines ?? []) as WineRow[], (reviews ?? []) as UserReview[])}
      />
    </PreviewThemeProvider>
  )
}
