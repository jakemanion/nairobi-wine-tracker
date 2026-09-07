/** Built-in collection keys used for sharing (and future custom-tag architecture). */

export const BUILTIN_COLLECTION_KEYS = ['wishlist', 'buy_again', 'shortlist'] as const

export type BuiltinCollectionKey = (typeof BUILTIN_COLLECTION_KEYS)[number]

/** Any collection key: built-in reserved names or a custom user_collections.id UUID string. */
export type CollectionKey = BuiltinCollectionKey | (string & {})

export type ShareableCollectionOption = {
  key: CollectionKey
  label: string
  kind: 'builtin' | 'custom'
}

/** Fixed share UI options — no DB lookup required. */
export const BUILTIN_SHARE_COLLECTIONS: ShareableCollectionOption[] = [
  { key: 'wishlist', label: 'Bookmarked', kind: 'builtin' },
  { key: 'buy_again', label: 'Buy again', kind: 'builtin' },
]

export const DEFAULT_SHARE_COLLECTION_KEYS: CollectionKey[] = BUILTIN_SHARE_COLLECTIONS.map(
  (option) => option.key,
)

export function isBuiltinCollectionKey(key: string): key is BuiltinCollectionKey {
  return (BUILTIN_COLLECTION_KEYS as readonly string[]).includes(key)
}

export function labelForCollectionKey(key: string): string {
  const builtin = BUILTIN_SHARE_COLLECTIONS.find((item) => item.key === key)
  if (builtin) return builtin.label
  if (key === 'shortlist') return 'Shortlist'
  return key
}
