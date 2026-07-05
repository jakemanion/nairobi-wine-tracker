import Link from 'next/link'
import { PreviewWineList } from '@/components/preview/preview-wine-list'
import { PreviewThemeProvider } from '@/components/preview/preview-theme-context'
import type { WineReview, WineRow } from '@/components/wine-table'
import { getPreviewSession } from '@/lib/auth/preview-session'
import { createServerReadClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type UserReview = {
  id: string
  wine_id: string
  overall_score: number | null
  value_score: number | null
  wishlist: number | null
  tried_status: number | null
  shortlist: number | null
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
        shortlist: review.shortlist,
        want_to_try: review.want_to_try,
        tasting_notes: review.tasting_notes,
        tasted_on: review.tasted_on,
      } satisfies WineReview,
    }
  })
}

export default async function Home() {
  const session = await getPreviewSession()
  const supabase = createServerReadClient()

  const winesQuery = supabase
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
    .order('wine_name')

  const reviewsQuery = session.isLoggedIn
    ? supabase
        .from('reviews')
        .select(`
          id,
          wine_id,
          overall_score,
          value_score,
          wishlist,
          tried_status,
          shortlist,
          want_to_try,
          tasting_notes,
          tasted_on
        `)
        .eq('user_id', session.userId)
    : null

  const [{ data: wines, error: winesError }, reviewsResult] = await Promise.all([
    winesQuery,
    reviewsQuery ?? Promise.resolve({ data: [], error: null }),
  ])

  const error = winesError ?? reviewsResult.error
  const reviews = (reviewsResult.data ?? []) as UserReview[]

  if (error) {
    return (
      <main className="p-6">
        <p style={{ color: '#c05050' }}>Error: {error.message}</p>
        <Link href="/" style={{ color: '#C93048' }}>
          Back to wine list
        </Link>
      </main>
    )
  }

  const wineRows = session.isLoggedIn
    ? attachReviews((wines ?? []) as WineRow[], reviews)
    : ((wines ?? []) as WineRow[])

  return (
    <PreviewThemeProvider>
      <PreviewWineList
        key={session.isLoggedIn ? session.userId : 'guest'}
        isLoggedIn={session.isLoggedIn}
        userId={session.userId ?? ''}
        userName={session.userName ?? ''}
        userEmail={session.userEmail ?? ''}
        wines={wineRows}
      />
    </PreviewThemeProvider>
  )
}
