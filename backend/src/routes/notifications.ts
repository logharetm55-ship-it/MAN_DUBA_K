// =============================================================
// Notifications API
// GET  /api/notifications        - جيب إشعارات اليوزر
// POST /api/notifications/read-all - علّم الكل مقروء
// POST /api/notifications/read/:id  - علّم واحد مقروء
// =============================================================

import { Hono } from 'hono'
import { getSupabaseClient } from '../lib/supabase'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'

export const notificationsRouter = new Hono<{ Bindings: Env }>()

notificationsRouter.use('*', authMiddleware)

// =============================================================
// In-Memory Fallback Store (when DB table doesn't exist)
// =============================================================
interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  icon: string | null
  is_read: boolean
  created_at: string
}

const memStore = new Map<string, Notification[]>()  // userId → notifications[]

function memAdd(notif: Notification) {
  const arr = memStore.get(notif.user_id) || []
  arr.unshift(notif)
  if (arr.length > 100) arr.splice(100)
  memStore.set(notif.user_id, arr)
}

function memGet(userId: string): Notification[] {
  return memStore.get(userId) || []
}

function memMarkRead(userId: string, id?: string) {
  const arr = memStore.get(userId) || []
  for (const n of arr) {
    if (!id || n.id === id) n.is_read = true
  }
}

// =====================
// GET /api/notifications
// =====================
notificationsRouter.get('/', async (c) => {
  const user = c.get('user')
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, icon, is_read, created_at')
    .eq('user_id', user.userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    // جدول مش موجود → رجّع من الـ memory store
    console.warn('[notifications] DB unavailable, using memory store:', error.code)
    const memNotifs = memGet(user.userId)
    return c.json({ success: true, notifications: memNotifs })
  }

  // دمج DB + memory (تجنّب التكرار بالـ id)
  const dbIds = new Set((data || []).map(n => n.id))
  const memNotifs = memGet(user.userId).filter(n => !dbIds.has(n.id))
  const merged = [...(data || []), ...memNotifs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)

  return c.json({ success: true, notifications: merged })
})

// =====================
// POST /api/notifications/read-all
// =====================
notificationsRouter.post('/read-all', async (c) => {
  const user = c.get('user')
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.userId).eq('is_read', false)
  } catch { /* graceful */ }

  memMarkRead(user.userId)
  return c.json({ success: true })
})

// =====================
// POST /api/notifications/read/:id
// =====================
notificationsRouter.post('/read/:id', async (c) => {
  const user = c.get('user')
  const notifId = c.req.param('id')
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    await supabase.from('notifications').update({ is_read: true })
      .eq('id', notifId).eq('user_id', user.userId)
  } catch { /* graceful */ }

  memMarkRead(user.userId, notifId)
  return c.json({ success: true })
})

// =============================================================
// helper: إنشاء إشعار لمستخدم معين (للاستخدام الداخلي)
// =============================================================
export async function createNotification(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  type: string,
  title: string,
  message: string,
  icon?: string,
) {
  const notif: Notification = {
    id: crypto.randomUUID(),
    user_id: userId,
    type,
    title,
    message,
    icon: icon || null,
    is_read: false,
    created_at: new Date().toISOString(),
  }

  // حفظ في الـ memory أولاً (فوري)
  memAdd(notif)

  // محاولة الحفظ في DB (best-effort)
  try {
    const { error } = await supabase.from('notifications').insert({
      id: notif.id,
      user_id: userId,
      type,
      title,
      message,
      icon: icon || null,
      is_read: false,
    })
    if (error && error.code !== 'PGRST205' && !error.message?.includes('does not exist')) {
      console.warn('[notifications] DB insert warn:', error.code)
    }
  } catch {
    // silent - memory store is the fallback
  }
}
