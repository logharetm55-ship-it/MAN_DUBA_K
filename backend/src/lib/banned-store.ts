// =============================================================
// Banned Users Store - In-memory with Supabase fallback
// =============================================================

export const bannedUserIds = new Set<string>()

export function banUser(userId: string) {
  bannedUserIds.add(userId)
}

export function unbanUser(userId: string) {
  bannedUserIds.delete(userId)
}

export function isBanned(userId: string): boolean {
  return bannedUserIds.has(userId)
}

// Try to load banned users from Supabase on startup
export async function loadBannedUsers(supabaseUrl: string, serviceKey: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_banned', true)
      .limit(5000)
    if (!error && data) {
      data.forEach(u => bannedUserIds.add(u.id))
      console.log(`[banned-store] Loaded ${data.length} banned users from DB`)
    }
  } catch {
    // Column might not exist — that's OK, memory store will be used
  }
}
