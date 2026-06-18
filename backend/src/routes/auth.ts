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
  const userId = crypto.randomUUID()
  const clerkId = `local_${phone}_${Date.now()}`
  const userName = role === 'CLIENT' ? `عميل_${phone.slice(-4)}` : (name || '')

  const now = new Date().toISOString()

  // نبني الـ insert — نجرب مع password_hash/address أول
  // لو مش موجودين، نحفظهم في avatar_url كـ JSON (pre-migration fallback)
  const authData = JSON.stringify({ ph: passwordHash, addr: address || null })

  const fullInsert = {
    id: userId,
    clerk_id: clerkId,
    phone,
    name: userName,
    role,
    password_hash: passwordHash,
    address: address || null,
    onboarded: true,
    created_at: now,
    updated_at: now,
  }

  let { data: newUser, error: userError } = await supabase
    .from('users')
    .insert(fullInsert)
    .select('id, phone, name, role, onboarded')
    .single()

  // لو فشل بسبب عمود ناقص → نخزّن في avatar_url كـ fallback
  if (userError && (userError.code === 'PGRST204' || userError.message?.includes('column'))) {
    console.warn('Pre-migration mode — storing auth data in avatar_url')
    const fallbackInsert = {
      id: userId,
      clerk_id: clerkId,
      phone,
      name: userName,
      role,
      avatar_url: `__mndwbk__:${authData}`,
      onboarded: true,
      created_at: now,
      updated_at: now,
    }
    const fallback = await supabase
      .from('users')
      .insert(fallbackInsert)
      .select('id, phone, name, role, avatar_url, onboarded')
      .single()
    newUser = fallback.data
    userError = fallback.error
  }

  if (userError || !newUser) {
    console.error('Register error:', userError)
    return c.json({ error: 'فشل التسجيل، جرب تاني' }, 500)
  }

  // لو مندوب → إنشاء سجل courier
  if (role === 'COURIER') {
    const courierInsert: Record<string, unknown> = {
      user_id: newUser.id,
      name: name || userName,
      phone,
      status: 'PENDING_REVIEW',
    }
    const { error: cErr } = await supabase.from('couriers').insert({ ...courierInsert, address: address || '' }).select().single()
    if (cErr && (cErr.code === 'PGRST204' || cErr.message?.includes('column'))) {
      await supabase.from('couriers').insert(courierInsert).select().single()
    }
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
      address: address || null,
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

  // جيب اليوزر — نجرب مع password_hash/address أول، لو مش موجودين نجرب بدونهم
  let userData: Record<string, unknown> | null = null
  let resolvedPasswordHash: string | null = null
  let resolvedAddress: string | null = null

  const { data: fullUser, error: fullErr } = await supabase
    .from('users')
    .select('id, phone, name, role, address, password_hash, avatar_url, onboarded')
    .eq('phone', phone)
    .single()

  if (fullUser) {
    userData = fullUser
    resolvedPasswordHash = (fullUser.password_hash as string | null) || null
    resolvedAddress = (fullUser.address as string | null) || null
  } else if (fullErr?.code === 'PGRST204' || fullErr?.message?.includes('column')) {
    // pre-migration → نجرب بـ columns الأساسية فقط
    const { data: basicUser } = await supabase
      .from('users')
      .select('id, phone, name, role, avatar_url, onboarded')
      .eq('phone', phone)
      .single()
    userData = basicUser
  }

  if (!userData) {
    return c.json({ error: 'الرقم أو الباسورد غلط' }, 401)
  }

  // استخرج الـ hash من avatar_url لو في pre-migration mode
  if (!resolvedPasswordHash && userData.avatar_url) {
    const avatarStr = String(userData.avatar_url)
    if (avatarStr.startsWith('__mndwbk__:')) {
      try {
        const json = JSON.parse(avatarStr.replace('__mndwbk__:', ''))
        resolvedPasswordHash = json.ph || null
        resolvedAddress = json.addr || null
      } catch { /* ignore */ }
    }
  }

  if (!resolvedPasswordHash) {
    return c.json({ error: 'الحساب ده مش عنده باسورد — سجّل حساب جديد' }, 401)
  }

  // تحقق من الباسورد
  const valid = await verifyPassword(String(password), resolvedPasswordHash)
  if (!valid) {
    return c.json({ error: 'الرقم أو الباسورد غلط' }, 401)
  }

  // حدّث last_seen_at لو العمود موجود
  supabase.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', userData.id).then(() => {}).catch(() => {})

  // جيب بيانات المندوب لو موجود
  let courierData = null
  if (userData.role === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers')
      .select('id, status, name, is_online')
      .eq('user_id', userData.id)
      .single()
    courierData = courier
  }

  // توكن JWT
  const token = await signJWT({
    userId: userData.id,
    phone: userData.phone,
    role: userData.role,
  }, c.env.JWT_SECRET || 'mandoubak-jwt-secret-2024')

  return c.json({
    success: true,
    token,
    user: {
      id: userData.id,
      phone: userData.phone,
      name: userData.name,
      role: userData.role,
      address: resolvedAddress || (userData.address as string | null) || null,
      onboarded: userData.onboarded,
      courierStatus: (courierData as Record<string, unknown> | null)?.status || null,
      courierId: (courierData as Record<string, unknown> | null)?.id || null,
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
