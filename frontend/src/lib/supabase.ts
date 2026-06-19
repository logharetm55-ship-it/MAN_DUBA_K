import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Singleton — prevents "Multiple GoTrueClient instances" warning
declare global {
  interface Window { __supabase_client__?: SupabaseClient }
}

if (!window.__supabase_client__) {
  window.__supabase_client__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      detectSessionInUrl: true,
      storageKey: 'mandoubak_supabase_auth',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  })
}

export const supabase = window.__supabase_client__!
