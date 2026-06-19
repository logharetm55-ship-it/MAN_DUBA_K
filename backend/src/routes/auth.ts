// =============================================================
// Auth Routes - تسجيل ودخول بالتليفون والباسورد
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabaseClient } from '../lib/supabase'
import { hashPassword, verifyPassword, signJWT } from '../lib/jwt-utils'
import { sendEmail, welcomeEmailHtml } from '../lib/resend'
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

  // لو مندوب → إنشاء سجل courier + إشعار لكل الأدمن
  if (role === 'COURIER') {
    const now = new Date().toISOString()
    const courierInsert: Record<string, unknown> = {
      id: crypto.randomUUID(),
      user_id: newUser.id,
      name: name || userName,
      phone,
      status: 'PENDING_REVIEW',
      address: address || '',
      id_front_image_url: '',
      id_back_image_url: '',
      created_at: now,
      updated_at: now,
    }
    const { error: cErr } = await supabase.from('couriers').insert(courierInsert)
    if (cErr) {
      console.error('Courier insert error:', cErr.code, cErr.message?.slice(0, 100))
    }

    // إشعار لكل الأدمن بتسجيل مندوب جديد (async)
    ;(async () => {
      try {
        const { data: admins } = await supabase
          .from('users').select('id').eq('role', 'ADMIN')
        if (admins && admins.length > 0) {
          const { createNotification } = await import('./notifications')
          await Promise.all(admins.map(a => createNotification(
            supabase, a.id, 'courier',
            '🛵 مندوب جديد ينتظر الموافقة',
            `${name || userName} (${phone}) سجّل وعايز موافقتك — اعتمده من صفحة المناديب`,
            '⏳'
          )))
        }
      } catch { /* best-effort */ }
    })()
  }

  // إرسال إيميل ترحيب لو عنده إيميل (async)
  ;(async () => {
    const resendKey = (c.env as Record<string, unknown>).RESEND_API_KEY as string | undefined
    if (resendKey && email) {
      await sendEmail(resendKey, {
        to: email,
        subject: 'أهلاً بك في مندوبك! 🛵',
        html: welcomeEmailHtml(newUser.name, role),
      })
    }
  })()

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
// POST /api/auth/send-otp - إرسال كود التحقق للرقم
// =====================
authRouter.post('/send-otp', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    phone: z.string().regex(/^01[0-9]{9}$/, 'رقم التليفون غلط'),
    purpose: z.enum(['register', 'login']).default('register'),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'رقم التليفون غلط (مثال: 01012345678)' }, 400)

  const { phone, purpose } = parsed.data

  // لو التسجيل: نتحقق إن الرقم مش مسجل
  if (purpose === 'register') {
    const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single()
    if (existing) {
      return c.json({ error: 'رقم التليفون ده مسجل قبل كده — سجل دخول' }, 409)
    }
  }

  // توليد كود 6 أرقام
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const otpKey = `otp:${phone}`

  // حفظ الكود في KV لمدة 5 دقائق
  await c.env.MANDOUBAK_KV.put(otpKey, otp, { expirationTtl: 300 })

  // محاولة إرسال SMS لو Twilio متاح
  const twilioSid = (c.env as Record<string, unknown>).TWILIO_ACCOUNT_SID as string | undefined
  const twilioToken = (c.env as Record<string, unknown>).TWILIO_AUTH_TOKEN as string | undefined
  const twilioPhone = (c.env as Record<string, unknown>).TWILIO_PHONE as string | undefined

  let smsSent = false
  if (twilioSid && twilioToken && twilioPhone) {
    try {
      const formData = new URLSearchParams({
        From: twilioPhone,
        To: `+2${phone}`,
        Body: `مندوبك: كود التحقق هو ${otp} — صالح لمدة 5 دقائق`,
      })
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          },
          body: formData,
        }
      )
      smsSent = resp.ok
    } catch { /* ignore */ }
  }

  // الكود يتسجل في الـ server console فقط (مش يتبعت للـ frontend)
  console.log(`[OTP DEV] ${phone} → ${otp}  (صالح 5 دقائق)`)

  return c.json({
    success: true,
    message: smsSent
      ? `✅ تم إرسال كود التحقق على ${phone}`
      : `📋 تم إنشاء الكود — مش عندنا SMS Provider دلوقتي`,
    smsSent,
  })
})

// =====================
// POST /api/auth/verify-otp - التحقق من الكود
// =====================
authRouter.post('/verify-otp', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    phone: z.string().regex(/^01[0-9]{9}$/, 'رقم التليفون غلط'),
    otp: z.string().length(6, 'الكود لازم 6 أرقام'),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'بيانات غير صحيحة' }, 400)

  const { phone, otp } = parsed.data
  const otpKey = `otp:${phone}`
  const stored = await c.env.MANDOUBAK_KV.get(otpKey)

  if (!stored) {
    return c.json({ error: 'الكود انتهت صلاحيته أو لم يُرسل — اطلب كود جديد' }, 400)
  }
  if (stored !== otp) {
    return c.json({ error: 'الكود غلط، جرب تاني' }, 400)
  }

  // حذف الكود بعد التحقق الناجح
  await c.env.MANDOUBAK_KV.delete(otpKey)

  return c.json({ success: true, message: 'تم التحقق من الرقم بنجاح ✅' })
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

// =====================
// POST /api/auth/sync-email-user - مزامنة يوزر Supabase Auth مع users table
// =====================
const emailRateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkEmailRateLimit(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const current = emailRateLimitMap.get(ip)
  if (!current || now > current.resetAt) {
    emailRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= max) return false
  current.count++
  return true
}

authRouter.post('/sync-email-user', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
  if (!checkEmailRateLimit(ip)) {
    return c.json({ error: 'كتير أوي — جرب بعد شوية' }, 429)
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'توكن مش موجود' }, 401)
  }
  const accessToken = authHeader.split(' ')[1]

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // تحقق من صحة الـ Supabase token
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(accessToken)
  if (authErr || !authUser) {
    return c.json({ error: 'التوكن غلط أو منتهي' }, 401)
  }

  const email = authUser.email || ''
  const uid = authUser.id
  const meta = (authUser.user_metadata || {}) as Record<string, string>

  // تحقق لو اليوزر موجود بالفعل في جدولنا
  const { data: existing } = await supabase
    .from('users')
    .select('id, name, role, address, phone, email, onboarded')
    .eq('clerk_id', uid)
    .maybeSingle()

  let userData: Record<string, unknown>

  if (existing) {
    userData = existing
  } else {
    // إنشاء يوزر جديد
    const role = (meta.role as string) || 'CLIENT'
    const name = (meta.name as string) || `مستخدم_${email.split('@')[0]}`
    const address = (meta.address as string) || null
    const userId = crypto.randomUUID()
    const now = new Date().toISOString()

    const insertData: Record<string, unknown> = {
      id: userId,
      clerk_id: uid,
      email,
      phone: null,
      name,
      role,
      address,
      onboarded: true,
      created_at: now,
      updated_at: now,
    }

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert(insertData)
      .select('id, name, role, address, phone, email, onboarded')
      .single()

    if (insertErr || !newUser) {
      console.error('sync-email-user insert error:', insertErr)
      return c.json({ error: 'فشل إنشاء الحساب، جرب تاني' }, 500)
    }
    userData = newUser

    // إرسال إيميل ترحيب عبر Resend (async)
    ;(async () => {
      const resendKey = (c.env as Record<string, unknown>).RESEND_API_KEY as string | undefined
      if (resendKey && email) {
        await sendEmail(resendKey, {
          to: email,
          subject: 'أهلاً بك في مندوبك! 🛵',
          html: welcomeEmailHtml(name, role),
        })
      }
    })()

    // لو مندوب → إنشاء سجل courier
    if (role === 'COURIER') {
      const courierInsert: Record<string, unknown> = {
        id: crypto.randomUUID(),
        user_id: newUser.id,
        name,
        phone: email,
        status: 'PENDING_REVIEW',
        address: address || '',
        id_front_image_url: '',
        id_back_image_url: '',
        created_at: now,
        updated_at: now,
      }
      const { error: cErr } = await supabase.from('couriers').insert(courierInsert)
      if (cErr) console.error('Courier sync insert error:', cErr.message?.slice(0, 100))

      // إشعار الأدمن
      ;(async () => {
        try {
          const { data: admins } = await supabase.from('users').select('id').eq('role', 'ADMIN')
          if (admins && admins.length > 0) {
            const { createNotification } = await import('./notifications')
            await Promise.all(admins.map(a => createNotification(
              supabase, a.id, 'courier',
              '🛵 مندوب جديد ينتظر الموافقة',
              `${name} (${email}) سجّل وعايز موافقتك`,
              '⏳'
            )))
          }
        } catch { /* best-effort */ }
      })()
    }
  }

  // بيانات المندوب لو موجود
  let courierData = null
  if ((userData.role as string) === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers')
      .select('id, status')
      .eq('user_id', userData.id)
      .single()
    courierData = courier
  }

  // إصدار JWT خاص بنا
  const token = await signJWT({
    userId: userData.id,
    phone: (userData.phone as string) || email,
    role: userData.role,
  }, c.env.JWT_SECRET || 'mandoubak-jwt-secret-2024')

  return c.json({
    success: true,
    token,
    user: {
      id: userData.id,
      email: userData.email || email,
      phone: userData.phone || null,
      name: userData.name,
      role: userData.role,
      address: userData.address || null,
      onboarded: userData.onboarded,
      courierStatus: (courierData as Record<string, unknown> | null)?.status || null,
      courierId: (courierData as Record<string, unknown> | null)?.id || null,
    },
  })
})

// =====================
// POST /api/auth/create-admin - إنشاء حساب أدمن (يحتاج مفتاح سري)
// =====================
authRouter.post('/create-admin', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    adminSecret: z.string().min(1),
    phone: z.string().regex(/^01[0-9]{9}$/),
    password: z.string().min(8),
    name: z.string().min(3).max(100),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'بيانات ناقصة أو غلط' }, 400)

  // التحقق من المفتاح السري
  const expectedSecret = (c.env as Record<string, unknown>).ADMIN_SECRET as string | undefined
    || 'mandoubak_admin_2024'
  if (parsed.data.adminSecret !== expectedSecret) {
    return c.json({ error: 'المفتاح السري غلط' }, 403)
  }

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // تحقق من وجود الرقم
  const { data: existing } = await supabase
    .from('users')
    .select('id, role')
    .eq('phone', parsed.data.phone)
    .single()

  if (existing) {
    if (existing.role === 'ADMIN') {
      return c.json({ error: 'الرقم ده بالفعل حساب أدمن' }, 409)
    }
    // ترقية الحساب الحالي لأدمن
    await supabase.from('users').update({ role: 'ADMIN' }).eq('id', existing.id)
    return c.json({ success: true, message: 'تم ترقية الحساب لأدمن ✅' })
  }

  const passwordHash = await hashPassword(parsed.data.password)
  const userId = crypto.randomUUID()
  const now = new Date().toISOString()

  const { error } = await supabase.from('users').insert({
    id: userId,
    clerk_id: `admin_${parsed.data.phone}_${Date.now()}`,
    phone: parsed.data.phone,
    name: parsed.data.name,
    role: 'ADMIN',
    password_hash: passwordHash,
    onboarded: true,
    created_at: now,
    updated_at: now,
  })

  if (error) {
    // fallback بدون password_hash
    const { error: err2 } = await supabase.from('users').insert({
      id: userId,
      clerk_id: `admin_${parsed.data.phone}_${Date.now()}`,
      phone: parsed.data.phone,
      name: parsed.data.name,
      role: 'ADMIN',
      avatar_url: `__mndwbk__:${JSON.stringify({ ph: passwordHash })}`,
      onboarded: true,
      created_at: now,
      updated_at: now,
    })
    if (err2) return c.json({ error: 'فشل إنشاء حساب الأدمن', details: err2.message }, 500)
  }

  return c.json({ success: true, message: `✅ تم إنشاء حساب الأدمن لـ ${parsed.data.phone}` }, 201)
})

// =====================
// POST /api/auth/confirm-by-email — تأكيد الإيميل بالبحث عنه (للـ login الأول)
// =====================
authRouter.post('/confirm-by-email', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({ email: z.string().email() })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'إيميل غير صحيح' }, 400)

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // البحث عن اليوزر بالإيميل
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('[confirm-by-email] listUsers error:', listErr.message)
    return c.json({ error: 'فشل البحث عن المستخدم' }, 500)
  }

  const user = users.find(u => u.email?.toLowerCase() === parsed.data.email.toLowerCase())
  if (!user) return c.json({ error: 'المستخدم غير موجود' }, 404)

  if (user.email_confirmed_at) {
    return c.json({ success: true, message: 'الإيميل مؤكد بالفعل' })
  }

  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (updateErr) {
    console.error('[confirm-by-email] update error:', updateErr.message)
    return c.json({ error: 'فشل تأكيد الإيميل' }, 500)
  }

  console.log('[confirm-by-email] ✅ confirmed:', parsed.data.email)
  return c.json({ success: true, message: 'تم تأكيد الإيميل ✅' })
})

// =====================
// POST /api/auth/auto-confirm — تأكيد إيميل المستخدم تلقائياً (بديل SMTP)
// يُستخدم بعد signUp مباشرةً لحل مشكلة "Email not confirmed"
// =====================
authRouter.post('/auto-confirm', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    userId: z.string().uuid('userId غير صحيح'),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'userId مطلوب' }, 400)

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase.auth.admin.updateUserById(parsed.data.userId, {
    email_confirm: true,
  })

  if (error) {
    console.error('[auto-confirm] error:', error.message)
    return c.json({ error: 'فشل تأكيد الإيميل: ' + error.message }, 500)
  }

  return c.json({ success: true, message: 'تم تأكيد الإيميل ✅' })
})
