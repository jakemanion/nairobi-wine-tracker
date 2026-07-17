'use server'

import { randomUUID } from 'crypto'
import { getPreviewSession } from '@/lib/auth/preview-session'
import {
  BUILTIN_SHARE_COLLECTIONS,
  isBuiltinCollectionKey,
  type CollectionKey,
  type ShareableCollectionOption,
} from '@/lib/share/collection-keys'
import { createAuthServerClient } from '@/lib/supabase-auth-server'

export type SharedListConfig = {
  id: string
  slug: string
  collectionKeys: CollectionKey[]
  updatedAt: string
}

export type ShareableCollectionsResult = {
  options: ShareableCollectionOption[]
}

function normalizeCollectionKeys(keys: string[]): CollectionKey[] {
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))]
  return unique.filter((key) => {
    if (isBuiltinCollectionKey(key)) return true
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key,
    )
  })
}

async function requireLoggedInUserId(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const session = await getPreviewSession()
  if (!session.isLoggedIn) {
    return { ok: false, error: 'You must be logged in to share lists.' }
  }
  return { ok: true, userId: session.userId }
}

export async function listShareableCollections(): Promise<
  ShareableCollectionsResult & { error?: string }
> {
  const auth = await requireLoggedInUserId()
  if (!auth.ok) return { options: BUILTIN_SHARE_COLLECTIONS, error: auth.error }

  const supabase = await createAuthServerClient()
  const { data, error } = await supabase
    .from('user_collections')
    .select('id, label')
    .eq('owner_id', auth.userId)
    .order('label')

  if (error) {
    return { options: BUILTIN_SHARE_COLLECTIONS }
  }

  const custom: ShareableCollectionOption[] = (data ?? []).map((row) => ({
    key: String(row.id),
    label: String(row.label),
    kind: 'custom' as const,
  }))

  return { options: [...BUILTIN_SHARE_COLLECTIONS, ...custom] }
}

export async function getMySharedList(): Promise<{
  config: SharedListConfig | null
  error?: string
}> {
  const auth = await requireLoggedInUserId()
  if (!auth.ok) return { config: null, error: auth.error }

  const supabase = await createAuthServerClient()
  const { data: sharedList, error } = await supabase
    .from('shared_lists')
    .select('id, slug, updated_at')
    .eq('owner_id', auth.userId)
    .maybeSingle()

  if (error) return { config: null, error: error.message }
  if (!sharedList) return { config: null }

  const { data: collections, error: collectionsError } = await supabase
    .from('shared_list_collections')
    .select('collection_key')
    .eq('shared_list_id', sharedList.id)

  if (collectionsError) return { config: null, error: collectionsError.message }

  return {
    config: {
      id: sharedList.id,
      slug: sharedList.slug,
      collectionKeys: (collections ?? []).map((row) => String(row.collection_key)),
      updatedAt: sharedList.updated_at,
    },
  }
}

async function replaceSharedListCollections(
  sharedListId: string,
  collectionKeys: CollectionKey[],
): Promise<string | null> {
  const supabase = await createAuthServerClient()

  const { error: deleteError } = await supabase
    .from('shared_list_collections')
    .delete()
    .eq('shared_list_id', sharedListId)

  if (deleteError) return deleteError.message

  if (collectionKeys.length === 0) return null

  const { error: insertError } = await supabase.from('shared_list_collections').insert(
    collectionKeys.map((collection_key) => ({
      shared_list_id: sharedListId,
      collection_key,
    })),
  )

  return insertError?.message ?? null
}

export async function upsertSharedList(collectionKeysInput: string[]): Promise<{
  config?: SharedListConfig
  error?: string
}> {
  const auth = await requireLoggedInUserId()
  if (!auth.ok) return { error: auth.error }

  const collectionKeys = normalizeCollectionKeys(collectionKeysInput)
  if (collectionKeys.length === 0) {
    return { error: 'Select at least one collection to share.' }
  }

  const supabase = await createAuthServerClient()
  const { data: existing, error: existingError } = await supabase
    .from('shared_lists')
    .select('id, slug, updated_at')
    .eq('owner_id', auth.userId)
    .maybeSingle()

  if (existingError) return { error: existingError.message }

  let sharedListId: string
  let slug: string
  let updatedAt: string

  if (existing) {
    sharedListId = existing.id
    slug = existing.slug
    const { data: updated, error: updateError } = await supabase
      .from('shared_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sharedListId)
      .select('updated_at')
      .single()

    if (updateError) return { error: updateError.message }
    updatedAt = updated.updated_at
  } else {
    slug = randomUUID()
    const { data: created, error: createError } = await supabase
      .from('shared_lists')
      .insert({ owner_id: auth.userId, slug })
      .select('id, slug, updated_at')
      .single()

    if (createError || !created) {
      return { error: createError?.message ?? 'Failed to create share link.' }
    }
    sharedListId = created.id
    slug = created.slug
    updatedAt = created.updated_at
  }

  const replaceError = await replaceSharedListCollections(sharedListId, collectionKeys)
  if (replaceError) return { error: replaceError }

  return {
    config: {
      id: sharedListId,
      slug,
      collectionKeys,
      updatedAt,
    },
  }
}

export async function regenerateSharedListSlug(): Promise<{
  config?: SharedListConfig
  error?: string
}> {
  const auth = await requireLoggedInUserId()
  if (!auth.ok) return { error: auth.error }

  const supabase = await createAuthServerClient()
  const { data: existing, error: existingError } = await supabase
    .from('shared_lists')
    .select('id')
    .eq('owner_id', auth.userId)
    .maybeSingle()

  if (existingError) return { error: existingError.message }
  if (!existing) return { error: 'Generate a share link before regenerating.' }

  const nextSlug = randomUUID()
  const { data: updated, error: updateError } = await supabase
    .from('shared_lists')
    .update({ slug: nextSlug })
    .eq('id', existing.id)
    .select('id, slug, updated_at')
    .single()

  if (updateError || !updated) {
    return { error: updateError?.message ?? 'Failed to regenerate share link.' }
  }

  const { data: collections, error: collectionsError } = await supabase
    .from('shared_list_collections')
    .select('collection_key')
    .eq('shared_list_id', updated.id)

  if (collectionsError) return { error: collectionsError.message }

  return {
    config: {
      id: updated.id,
      slug: updated.slug,
      collectionKeys: (collections ?? []).map((row) => String(row.collection_key)),
      updatedAt: updated.updated_at,
    },
  }
}
