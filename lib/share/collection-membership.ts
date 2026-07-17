import type { BuiltinCollectionKey, CollectionKey } from '@/lib/share/collection-keys'
import { isBuiltinCollectionKey } from '@/lib/share/collection-keys'

type ReviewMembershipFields = {
  wishlist: number | null
  tried_status: number | null
  shortlist: number | null
}

/** Whether a review places a wine in a built-in collection. */
export function reviewMatchesBuiltinCollection(
  review: ReviewMembershipFields,
  key: BuiltinCollectionKey,
): boolean {
  switch (key) {
    case 'wishlist':
      return (review.wishlist ?? 0) >= 1
    case 'buy_again':
      return review.tried_status === 1
    case 'shortlist':
      return review.shortlist === 1
    default: {
      const _exhaustive: never = key
      return _exhaustive
    }
  }
}

/**
 * Resolve whether a wine belongs in the shared selection.
 * Custom collections pass wine IDs keyed by collection UUID string.
 */
export function wineMatchesSharedCollections(args: {
  wineId: string
  review: ReviewMembershipFields | null | undefined
  selectedKeys: readonly CollectionKey[]
  customWineIdsByCollection: ReadonlyMap<string, ReadonlySet<string>>
}): boolean {
  const { wineId, review, selectedKeys, customWineIdsByCollection } = args
  if (selectedKeys.length === 0) return false

  for (const key of selectedKeys) {
    if (isBuiltinCollectionKey(key)) {
      if (review && reviewMatchesBuiltinCollection(review, key)) return true
      continue
    }
    if (customWineIdsByCollection.get(key)?.has(wineId)) return true
  }

  return false
}
