// =============================================================
// Notifications API
// GET  /api/notifications        - جيب إشعارات اليوزر
// POST /api/notifications/read   - علّم قُرئ
// POST /api/notifications/create - إنشاء إشعار (داخلي)
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { getSupabaseClient } from '../lib/supabase'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'

export const notificationsRouter = new Hono<{ Bindings: Env }>()

notificationsRouter.use('*', authMiddleware)

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
    // جدول الإشعارات مش موجود بعد → ارجع array فاضي
    if (error.code === 'PGRST204' || error.message?.includes('relation') || error.message?.includes('column')) {
      return c.json({ success: true, notifications: [] })
    }
    return c.json({ error: 'مقدرناش نجيب الإشعارات' }, 500)
  }

  return c.json({ success: true, notifications: data || [] })
})

// =====================
// POST /api/notifications/read-all
// =====================
notificationsRouter.post('/read-all', async (c) => {
  const user = c.get('user')
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.userId)
    .eq('is_read', false)

  return c.json({ success: true })
})

// =====================
// POST /api/notifications/read/:id
// =====================
notificationsRouter.post('/read/:id', async (c) => {
  const user = c.get('user')
  const notifId = c.req.param('id')
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId)
    .eq('user_id', user.userId)

  return c.json({ success: true })
})

// =====================
// helper: إنشاء إشعار لمستخدم معين (للاستخدام الداخلي)
// =====================
export async function createNotification(
  supabase: ReturnType<typeof getSupabaseClient>,
  userId: string,
  type: string,
  title: string,
  message: string,
  icon?: string,
) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      icon: icon || null,
      is_read: false,
    })
  } catch {
    // إشعارات best-effort — مش ضروري تفشل العملية الأساسية
  }
}
