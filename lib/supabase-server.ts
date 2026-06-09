import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

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
