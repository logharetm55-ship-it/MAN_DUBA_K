// =============================================================
// Auth Routes - تسجيل ودخول بالتليفون والباسورد
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabaseClient } from '../lib/supabase'
import { hashPassword, verifyPassword, signJWT } from '../lib/jwt-utils'
import type { Env } from '../index'

export const authRouter = new Hono<{ Bindings: Env }>()

// =====================
// POST /api/auth/register - تسجيل جديد
// =====================
const registerSchema = z.object({
  phone: z.string().regex(/^01[0-9]{9}$/, 'رقم التليفون غلط (مثال: 01012345678)'),
  password: z.string().min(6, 'الباسورد لازم 6 حروف على الأقل'),
  role: z.enum(['CLIENT', 'COURIER']),
  // للعميل
  address: z.string().min(5, 'العنوان قصير جداً').max(500).optional(),
  // للمندوب
  name: z.string().min(3, 'الاسم لازم 3 حروف على الأقل').max(100).optional(),
})

authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const { phone, password, role, address, name } = c.req.valid('json')

  // التحقق من البيانات المطلوبة حسب الدور
  if (role === 'CLIENT' && !address) {
    return c.json({ error: 'العنوان مطلوب للعملاء' }, 400)
  }
  if (role === 'COURIER' && !name) {
    return c.json({ error: 'الاسم مطلوب للمناديب' }, 400)
  }

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // تحقق من وجود الرقم مسبقاً
  const { data: existing } = await supabase
    .from('users')
    .select('id, phone')
    .eq('phone', phone)
    .single()

  if (existing) {
    return c.json({ error: 'رقم التليفون ده مسجل قبل كده' }, 409)
  }

  // هاش الباسورد
  const passwordHash = await hashPassword(password)

  // إنشاء يوزر جديد
  const clerkId = `local_${phone}_${Date.now()}`
  const userName = role === 'CLIENT' ? `عميل_${phone.slice(-4)}` : (name || '')

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      phone,
      name: userName,
      role,
      password_hash: passwordHash,
      address: address || null,
      onboarded: true,
    })
    .select('id, phone, name, role, address, onboarded')
    .single()

  if (userError || !newUser) {
    console.error('Register error:', userError)
    return c.json({ error: 'فشل التسجيل، جرب تاني' }, 500)
  }

  // لو مندوب → إنشاء سجل courier فاضي
  if (role === 'COURIER') {
    await supabase.from('couriers').insert({
      user_id: newUser.id,
      name: name || userName,
      phone,
      address: address || '',
      status: 'PENDING_REVIEW',
    }).select().single()
  }

  // توكن JWT
  const token = await signJWT({
    userId: newUser.id,
    phone: newUser.phone,
    role: newUser.role,
  }, c.env.JWT_SECRET || 'mandoubak-jwt-secret-2024')

  return c.json({
    success: true,
    token,
    user: {
      id: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      role: newUser.role,
      address: newUser.address,
      onboarded: newUser.onboarded,
    },
  }, 201)
})

// =====================
// POST /api/auth/login - تسجيل دخول
// =====================
const loginSchema = z.object({
  phone: z.string().regex(/^01[0-9]{9}$/, 'رقم التليفون غلط'),
  password: z.string().min(1, 'ادخل الباسورد'),
})

authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { phone, password } = c.req.valid('json')
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // جيب اليوزر
  const { data: user } = await supabase
    .from('users')
    .select('id, phone, name, role, address, password_hash, onboarded')
    .eq('phone', phone)
    .single()

  if (!user) {
    return c.json({ error: 'الرقم أو الباسورد غلط' }, 401)
  }

  if (!user.password_hash) {
    return c.json({ error: 'الحساب ده محتاج تسجيل باسورد — سجّل حساب جديد' }, 401)
  }

  // تحقق من الباسورد
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({ error: 'الرقم أو الباسورد غلط' }, 401)
  }

  // حدّث last_seen_at
  await supabase
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id)

  // جيب بيانات المندوب لو موجود
  let courierData = null
  if (user.role === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers')
      .select('id, status, name, is_online')
      .eq('user_id', user.id)
      .single()
    courierData = courier
  }

  // توكن JWT
  const token = await signJWT({
    userId: user.id,
    phone: user.phone,
    role: user.role,
  }, c.env.JWT_SECRET || 'mandoubak-jwt-secret-2024')

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      address: user.address,
      onboarded: user.onboarded,
      courierStatus: courierData?.status || null,
      courierId: courierData?.id || null,
    },
  })
})

// =====================
// POST /api/auth/update-courier-info - تحديث بيانات المندوب بعد رفع البطاقة
// =====================
authRouter.post('/update-courier-info', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'مش مسجل دخول' }, 401)
  }

  const token = authHeader.split(' ')[1]
  const { verifyJWT } = await import('../lib/jwt-utils')
  const payload = await verifyJWT(token, c.env.JWT_SECRET || 'mandoubak-jwt-secret-2024')
  if (!payload) return c.json({ error: 'التوكن غلط' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'بيانات غلط' }, 400) }

  const schema = z.object({
    name: z.string().min(3).max(100),
    address: z.string().min(5).max(500),
    idFrontImageUrl: z.string().min(1),
    idBackImageUrl: z.string().min(1),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'بيانات ناقصة', details: parsed.error.flatten() }, 400)

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from('couriers')
    .update({
      name: parsed.data.name,
      address: parsed.data.address,
      id_front_image_url: parsed.data.idFrontImageUrl,
      id_back_image_url: parsed.data.idBackImageUrl,
      status: 'PENDING_REVIEW',
    })
    .eq('user_id', String(payload.userId))

  if (error) return c.json({ error: 'فشل تحديث البيانات' }, 500)

  await supabase
    .from('users')
    .update({ name: parsed.data.name, address: parsed.data.address })
    .eq('id', String(payload.userId))

  return c.json({ success: true, message: 'تم تحديث البيانات وهيتراجع الأدمن' })
})
