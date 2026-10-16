import type { WineReview } from '@/components/wine-table'

/** Display label for the wine's current My wines marking. */
export function myWineMarkingLabel(review: WineReview | null | undefined): string {
  if (review?.wishlist != null && review.wishlist >= 1) return 'Bookmarked'
  if (review?.tried_status === 1) return 'Buy again'
  if (review?.tried_status === 2 || review?.tried_status === 3) return "Don't buy again"
  if (review?.hide === true) return 'Ignored'
  return 'Unmarked'
}
