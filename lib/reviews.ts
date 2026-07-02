import { supabase } from '@/lib/supabase'
import type { WineReview } from '@/components/wine-table'

export type WishlistValue = 0 | 1 | 2 | 3 | null

export type TriedStatusValue = 0 | 1 | 2 | null

export type ShortlistValue = 1 | null

export type ReviewBoolField = 'want_to_try' | 'tried' | 'would_buy_again'

export type ReviewEditableField =
  | ReviewBoolField
  | 'overall_score'
  | 'tasting_notes'
  | 'wishlist'
  | 'tried_status'
  | 'shortlist'

const reviewSelect = `
  id,
  overall_score,
  value_score,
  wishlist,
  tried_status,
  shortlist,
  want_to_try,
  tried,
  would_buy_again,
  tasting_notes,
  tasted_on
`

type SaveReviewFieldArgs = {
  userId: string
  wineId: string
  reviewId?: string | null
  field: ReviewEditableField
  value: boolean | number | string | null
}

type SaveReviewFieldResult =
  | { review: WineReview; error?: undefined }
  | { review?: undefined; error: string }

export async function saveReviewField({
  userId,
  wineId,
  reviewId,
  field,
  value,
}: SaveReviewFieldArgs): Promise<SaveReviewFieldResult> {
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

export const saveReviewBoolField = saveReviewField

type SaveReviewWishlistArgs = {
  userId: string
  wineId: string
  reviewId?: string | null
  value: WishlistValue
}

export async function saveReviewWishlistField({
  userId,
  wineId,
  reviewId,
  value,
}: SaveReviewWishlistArgs): Promise<SaveReviewFieldResult> {
  return saveReviewField({
    userId,
    wineId,
    reviewId,
    field: 'wishlist',
    value,
  })
}

type SaveReviewTriedStatusArgs = {
  userId: string
  wineId: string
  reviewId?: string | null
  value: TriedStatusValue
}

export async function saveReviewTriedStatusField({
  userId,
  wineId,
  reviewId,
  value,
}: SaveReviewTriedStatusArgs): Promise<SaveReviewFieldResult> {
  return saveReviewField({
    userId,
    wineId,
    reviewId,
    field: 'tried_status',
    value,
  })
}

type SaveReviewShortlistArgs = {
  userId: string
  wineId: string
  reviewId?: string | null
  value: ShortlistValue
}

export async function saveReviewShortlistField({
  userId,
  wineId,
  reviewId,
  value,
}: SaveReviewShortlistArgs): Promise<SaveReviewFieldResult> {
  return saveReviewField({
    userId,
    wineId,
    reviewId,
    field: 'shortlist',
    value,
  })
}

type ClearUserShortlistResult =
  | { error?: undefined }
  | { error: string }

export async function clearUserShortlist(userId: string): Promise<ClearUserShortlistResult> {
  const { error } = await supabase
    .from('reviews')
    .update({ shortlist: null })
    .eq('user_id', userId)
    .eq('shortlist', 1)

  if (error) return { error: error.message }
  return {}
}
