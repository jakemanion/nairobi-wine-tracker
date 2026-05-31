import { supabase } from '@/lib/supabase'
import type { WineReview } from '@/components/wine-table'

export type ReviewBoolField = 'want_to_try' | 'tried' | 'would_buy_again'

const reviewSelect = `
  id,
  overall_score,
  value_score,
  want_to_try,
  tried,
  would_buy_again,
  tasting_notes,
  tasted_on
`

type SaveReviewBoolFieldArgs = {
  userId: string
  wineId: string
  reviewId?: string | null
  field: ReviewBoolField
  value: boolean | null
}

type SaveReviewBoolFieldResult =
  | { review: WineReview; error?: undefined }
  | { review?: undefined; error: string }

export async function saveReviewBoolField({
  userId,
  wineId,
  reviewId,
  field,
  value,
}: SaveReviewBoolFieldArgs): Promise<SaveReviewBoolFieldResult> {
  if (reviewId) {
    const { data, error } = await supabase
      .from('reviews')
      .update({ [field]: value })
      .eq('id', reviewId)
      .eq('user_id', userId)
      .select(reviewSelect)
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: 'Update failed. You may not have permission to edit this review.' }

    return { review: data as WineReview }
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      wine_id: wineId,
      user_id: userId,
      [field]: value,
    })
    .select(reviewSelect)
    .single()

  if (error) return { error: error.message }

  return { review: data as WineReview }
}
