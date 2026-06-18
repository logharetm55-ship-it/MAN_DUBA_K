// =============================================================
// Supabase Client Factory — مع دعم Node.js 20
// =============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import ws from 'ws'

const clients = new Map<string, SupabaseClient>()

/**
 * أنشئ أو ارجع Supabase client جاهز مع دعم WebSocket لـ Node.js 20
 */
export function getSupabaseClient(url: string, key: string): SupabaseClient {
  const cacheKey = `${url}:${key.slice(-8)}`
  if (clients.has(cacheKey)) return clients.get(cacheKey)!

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: ws,
    } as any,
    global: {
      headers: { 'x-client-info': 'mandoubak-backend' },
    },
  })

  clients.set(cacheKey, client)
  return client
}
