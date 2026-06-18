// =============================================================
// Users Routes - جلب وتحديث بيانات اليوزر
// =============================================================

import { Hono } from 'hono'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'

export const usersRouter = new Hono<{ Bindings: Env }>()

// GET /api/users/me - بيانات اليوزر الحالي
usersRouter.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user')

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: user, error } = await supabase
    .from('users')
    .select('id, clerk_id, name, email, phone, role, avatar_url, onboarded, created_at')
    .eq('clerk_id', authUser.clerkId)
    .single()

  if (error || !user) {
    return c.json({ error: 'اليوزر مش موجود' }, 404)
  }

  return c.json(user)
})

// PATCH /api/users/me - تحديث بيانات اليوزر
usersRouter.patch('/me', authMiddleware, async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json() as { name?: string; phone?: string }

  const allowed: Record<string, unknown> = {}
  if (body.name) allowed.name = body.name
  if (body.phone) allowed.phone = body.phone
  allowed.updated_at = new Date().toISOString()

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('users')
    .update(allowed)
    .eq('clerk_id', authUser.clerkId)
    .select('id, clerk_id, name, email, phone, role, avatar_url, onboarded')
    .single()

  if (error) {
    return c.json({ error: 'فشل تحديث البيانات' }, 500)
  }

  return c.json(data)
})

// POST /api/users/onboard - اختيار الدور بعد التسجيل الأول
usersRouter.post('/onboard', authMiddleware, async (c) => {
  const authUser = c.get('user')
  const body = await c.req.json() as { role: 'CLIENT' | 'COURIER' }

  if (!['CLIENT', 'COURIER'].includes(body.role)) {
    return c.json({ error: 'الدور مش صحيح' }, 400)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('users')
    .update({
      role: body.role,
      onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', authUser.clerkId)
    .select('id, clerk_id, name, email, phone, role, avatar_url, onboarded')
    .single()

  if (error) {
    console.error('Onboard error:', error)
    return c.json({ error: 'فشل تحديث الدور' }, 500)
  }

  console.log(`✅ User onboarded as ${body.role}:`, authUser.clerkId)
  return c.json(data)
})
