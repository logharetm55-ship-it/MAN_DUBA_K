// =============================================================
// Supabase Client Factory
// =============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseClient(url: string, serviceKey: string): SupabaseClient {
  if (!_client) {
    _client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })
  }
  return _client
}
