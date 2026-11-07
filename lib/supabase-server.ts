import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

/** PostgREST/Supabase default max rows per request. */
export const SUPABASE_PAGE_SIZE = 1000

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Fetch every row for a query that would otherwise be truncated at the
 * Supabase/PostgREST default of 1000 rows.
 */
export async function fetchAllPaged<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1)
    if (error) return { data: rows, error }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return { data: rows, error: null }
}

export function createServerReadClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  const key = serviceRoleKey ?? anonKey
  if (!key) {
    throw new Error('Missing Supabase API key for server reads')
  }

  return createClient(supabaseUrl, key, {
    global: { fetch: noStoreFetch },
  })
}
