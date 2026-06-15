import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { EnrichmentConfig } from '../config'

export function createSupabaseClient(config: EnrichmentConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
