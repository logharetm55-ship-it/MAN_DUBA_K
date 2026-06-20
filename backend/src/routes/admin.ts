// =============================================================
// Admin API - لوحة تحكم الأدمن
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { getSupabaseClient } from '../lib/supabase'
import type { Env } from '../index'
import { requireRole } from '../middleware/auth'
import { banUser, unbanUser } from '../lib/banned-store'

export const adminRouter = new Hono<{ Bindings: Env }>()

adminRouter.use('*', requireRole('ADMIN'))

// =====================
// GET /admin/dashboard
// =====================
adminRouter.get('/dashboard', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const [ordersRes, couriersRes, adsRes, revenueRes, clientsRes] = await Promise.all([
    supabase.from('orders').select('status'),
    supabase.from('couriers').select('status'),
    supabase.from('ad_offers').select('is_active, click_count'),
    supabase.from('orders').select('delivery_fee').eq('status', 'DELIVERED'),
    supabase.from('users').select('role, last_seen_at').eq('role', 'CLIENT'),
  ])

  const orders = ordersRes.data || []
  const couriers = couriersRes.data || []
  const ads = adsRes.data || []
  const revenue = revenueRes.data || []
  const clients = clientsRes.data || []

  const now = Date.now()
  const fifteenMinutesAgo = now - 15 * 60 * 1000

  const totalRevenue = revenue.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)
  const activeClients = clients.filter(u =>
    u.last_seen_at && new Date(u.last_seen_at).getTime() > fifteenMinutesAgo
  ).length

  return c.json({
    success: true,
    stats: {
      orders: {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        accepted: orders.filter(o => o.status === 'ACCEPTED').length,
        delivered: orders.filter(o => o.status === 'DELIVERED').length,
        cancelled: orders.filter(o => o.status === 'CANCELLED').length,
      },
      couriers: {
        total: couriers.length,
        approved: couriers.filter(c => c.status === 'APPROVED').length,
        pending: couriers.filter(c => c.status === 'PENDING_REVIEW').length,
        suspended: couriers.filter(c => c.status === 'SUSPENDED').length,
      },
      clients: {
        total: clients.length,
        activeNow: activeClients,
      },
      ads: {
        total: ads.length,
        active: ads.filter(a => a.is_active).length,
        totalClicks: ads.reduce((sum, a) => sum + (a.click_count || 0), 0),
      },
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        currency: 'EGP',
      },
    },
  })
})

// =====================
// GET /admin/couriers
// =====================
adminRouter.get('/couriers', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const status = c.req.query('status')
  const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']
  if (status && !validStatuses.includes(status)) {
    return c.json({ error: 'حالة غير صحيحة' }, 400)
  }

  let query = supabase
    .from('couriers')
    .select('id, name, phone, address, status, rating, total_deliveries, is_online, id_front_image_url, id_back_image_url, created_at, users(name, phone, address, last_seen_at)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return c.json({ error: 'مقدرناش نجيب المناديب' }, 500)
  return c.json({ success: true, couriers: data || [] })
})

// =====================
// PATCH /admin/couriers/:id/approve
// =====================
adminRouter.patch('/couriers/:id/approve', async (c) => {
  const courierId = c.req.param('id')
  if (!courierId || courierId.length > 50) {
    return c.json({ error: 'معرّف مندوب غير صحيح' }, 400)
  }

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING_REVIEW']),
    reason: z.string().max(500).optional(),
    clearImages: z.boolean().optional(),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'حالة غير صحيحة' }, 400)

  const { status, clearImages } = parsed.data
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const dbUpdate: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (clearImages) {
    dbUpdate.id_front_image_url = null
    dbUpdate.id_back_image_url = null
  }

  const { data: updatedCourier, error } = await supabase
    .from('couriers')
    .update(dbUpdate)
    .eq('id', courierId)
    .select('user_id, name')
    .single()

  if (error) return c.json({ error: 'مقدرناش نحدث الحالة' }, 500)

  // إشعار للمندوب بنتيجة المراجعة
  if (updatedCourier?.user_id) {
    const { createNotification } = await import('./notifications')
    const notifMap: Record<string, { title: string; message: string; icon: string }> = {
      APPROVED: { title: '🎉 تمت الموافقة على حسابك', message: 'مبروك! حسابك كمندوب تمت الموافقة عليه — يمكنك الآن قبول الطلبات وبدء العمل', icon: '✅' },
      REJECTED: { title: '❌ تم رفض حسابك', message: 'للأسف تم رفض طلب انضمامك — تواصل معنا لمعرفة السبب', icon: '❌' },
      SUSPENDED: { title: '⏸️ تم إيقاف حسابك مؤقتاً', message: 'تم إيقاف حسابك مؤقتاً — تواصل مع الإدارة', icon: '⚠️' },
      PENDING_REVIEW: clearImages
        ? { title: '📋 يرجى إعادة رفع صور البطاقة', message: 'الصور المرفوعة غير واضحة أو غير صحيحة — يرجى العودة لصفحة التسجيل ورفع صور البطاقة مجدداً بشكل صحيح', icon: '🔄' }
        : null as unknown as { title: string; message: string; icon: string },
    }
    const notif = notifMap[status]
    if (notif) {
      createNotification(supabase, updatedCourier.user_id, 'courier', notif.title, notif.message, notif.icon).catch(() => {})
    }
  }

  return c.json({
    success: true,
    message: status === 'APPROVED' ? 'تم الموافقة على المندوب'
      : status === 'REJECTED' ? 'تم رفض المندوب'
      : status === 'SUSPENDED' ? 'تم إيقاف المندوب'
      : 'تم طلب إعادة إرسال البيانات',
  })
})

// =====================
// POST /admin/couriers/:id/ban  — حظر مندوب كامل
// POST /admin/clients/:id/ban   — حظر عميل كامل
// =====================
adminRouter.post('/couriers/:id/ban', async (c) => {
  const courierId = c.req.param('id')
  if (!courierId) return c.json({ error: 'معرّف مندوب غير صحيح' }, 400)
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // جلب user_id للمندوب
  const { data: courier } = await supabase.from('couriers').select('user_id').eq('id', courierId).single()
  if (!courier?.user_id) return c.json({ error: 'المندوب مش موجود' }, 404)

  // تعطيل حساب المندوب في جدول couriers
  await supabase.from('couriers').update({ status: 'SUSPENDED', updated_at: new Date().toISOString() }).eq('id', courierId)

  // حظر المستخدم في الذاكرة + محاولة تحديث DB
  banUser(courier.user_id)
  await supabase.from('users').update({ is_banned: true, updated_at: new Date().toISOString() }).eq('id', courier.user_id).then(() => {})

  const { createNotification } = await import('./notifications')
  createNotification(supabase, courier.user_id, 'courier', '🚫 تم حظر حسابك', 'تم حظر حسابك نهائياً بسبب مخالفة شروط الاستخدام. تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.', '🚫').catch(() => {})

  return c.json({ success: true, message: 'تم حظر المندوب' })
})

adminRouter.post('/couriers/:id/unban', async (c) => {
  const courierId = c.req.param('id')
  if (!courierId) return c.json({ error: 'معرّف مندوب غير صحيح' }, 400)
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: courier } = await supabase.from('couriers').select('user_id').eq('id', courierId).single()
  if (!courier?.user_id) return c.json({ error: 'المندوب مش موجود' }, 404)

  unbanUser(courier.user_id)
  await supabase.from('users').update({ is_banned: false, updated_at: new Date().toISOString() }).eq('id', courier.user_id).then(() => {})
  await supabase.from('couriers').update({ status: 'PENDING_REVIEW', updated_at: new Date().toISOString() }).eq('id', courierId)

  return c.json({ success: true, message: 'تم رفع الحظر' })
})

adminRouter.post('/clients/:id/ban', async (c) => {
  const clientId = c.req.param('id')
  if (!clientId) return c.json({ error: 'معرّف العميل غير صحيح' }, 400)
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  banUser(clientId)
  await supabase.from('users').update({ is_banned: true, updated_at: new Date().toISOString() }).eq('id', clientId).then(() => {})

  const { createNotification } = await import('./notifications')
  createNotification(supabase, clientId, 'client', '🚫 تم حظر حسابك', 'تم حظر حسابك نهائياً بسبب مخالفة شروط الاستخدام. تواصل مع الدعم.', '🚫').catch(() => {})

  return c.json({ success: true, message: 'تم حظر العميل' })
})

adminRouter.post('/clients/:id/unban', async (c) => {
  const clientId = c.req.param('id')
  if (!clientId) return c.json({ error: 'معرّف العميل غير صحيح' }, 400)
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  unbanUser(clientId)
  await supabase.from('users').update({ is_banned: false, updated_at: new Date().toISOString() }).eq('id', clientId).then(() => {})

  return c.json({ success: true, message: 'تم رفع الحظر' })
})

// =====================
// GET /admin/clients - كل العملاء
// =====================
adminRouter.get('/clients', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const now = Date.now()
  const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, address, last_seen_at, created_at')
    .eq('role', 'CLIENT')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(200)

  if (error) return c.json({ error: 'مقدرناش نجيب العملاء' }, 500)

  const clients = (data || []).map(u => ({
    ...u,
    isActiveNow: u.last_seen_at ? u.last_seen_at > fifteenMinutesAgo : false,
  }))

  return c.json({ success: true, clients })
})

// =====================
// GET /admin/orders
// =====================
adminRouter.get('/orders', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const status = c.req.query('status')
  const pageRaw = parseInt(c.req.query('page') || '1')
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : Math.min(pageRaw, 1000)
  const limit = 20
  const offset = (page - 1) * limit

  const validStatuses = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED']
  if (status && !validStatuses.includes(status)) {
    return c.json({ error: 'حالة غير صحيحة' }, 400)
  }

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, type, status, delivery_fee, distance_km, num_shops,
      pickup_details, delivery_details, recipient_phone, notes, created_at, accepted_at, completed_at,
      order_items(name, quantity, price, shop_name),
      couriers(name, phone),
      users!orders_client_id_fkey(name, phone)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return c.json({ error: 'مقدرناش نجيب الأوردرات' }, 500)

  return c.json({
    success: true,
    orders: data || [],
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  })
})

// =====================
// GET /admin/security-alerts
// =====================
adminRouter.get('/security-alerts', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase
    .from('security_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return c.json({ success: true, alerts: [] })
  return c.json({ success: true, alerts: data || [] })
})

// =====================
// POST /admin/security-alerts/mark-read
// =====================
adminRouter.post('/security-alerts/mark-read', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  await supabase.from('security_alerts').update({ is_read: true }).eq('is_read', false)
  return c.json({ success: true })
})

// =====================
// Pricing Management
// =====================
adminRouter.get('/pricing', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('admin_pricing').select('*').order('zone')
  if (error) return c.json({ error: 'مقدرناش نجيب الأسعار' }, 500)
  return c.json({ success: true, pricing: data || [] })
})

const pricingSchema = z.object({
  zone: z.string().min(2).max(100),
  pricePerKm: z.number().positive().max(1000),
  minimumFee: z.number().positive().max(10000),
  maximumFee: z.number().positive().max(10000).optional(),
  pricePerShop: z.number().positive().max(1000).optional(),
  baseFeeShoppping: z.number().positive().max(10000).optional(),
  isActive: z.boolean().default(true),
})

adminRouter.post('/pricing', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }
  const parsed = pricingSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'بيانات غلط', details: parsed.error.flatten() }, 400)

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase
    .from('admin_pricing')
    .upsert({
      zone: parsed.data.zone,
      price_per_km: parsed.data.pricePerKm,
      minimum_fee: parsed.data.minimumFee,
      maximum_fee: parsed.data.maximumFee,
      price_per_shop: parsed.data.pricePerShop ?? 5,
      base_fee_shopping: parsed.data.baseFeeShoppping ?? 15,
      is_active: parsed.data.isActive,
    }, { onConflict: 'zone' })
    .select().single()

  if (error) return c.json({ error: 'مقدرناش نحفظ السعر' }, 500)
  return c.json({ success: true, pricing: data })
})

// =====================
// Ads Management
// =====================
adminRouter.get('/ads', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase
    .from('ad_offers')
    .select('id, title, description, image_url, shop_name, product_name, product_price, is_active, click_count, start_date, end_date, created_at')
    .order('created_at', { ascending: false })
  if (error) return c.json({ error: 'مقدرناش نجيب العروض' }, 500)
  return c.json({ success: true, ads: data || [] })
})

const adSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().max(2000).optional().default('https://placehold.co/400x250/f97316/fff?text=Ad'),
  shopName: z.string().min(3).max(200),
  shopAddress: z.string().min(5).max(500),
  shopLat: z.number().min(-90).max(90).optional().default(30.0444),
  shopLng: z.number().min(-180).max(180).optional().default(31.2357),
  productName: z.string().min(3).max(200),
  productPrice: z.number().positive().max(100000).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
})

adminRouter.post('/ads', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }
  const parsed = adSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'بيانات العرض غلط', details: parsed.error.flatten() }, 400)
  if (new Date(parsed.data.endDate) <= new Date(parsed.data.startDate)) {
    return c.json({ error: 'تاريخ الانتهاء لازم يكون بعد تاريخ البداية' }, 400)
  }

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('ad_offers').insert({
    id: crypto.randomUUID(),
    title: parsed.data.title, description: parsed.data.description,
    image_url: parsed.data.imageUrl, shop_name: parsed.data.shopName,
    shop_address: parsed.data.shopAddress, shop_lat: parsed.data.shopLat,
    shop_lng: parsed.data.shopLng, product_name: parsed.data.productName,
    product_price: parsed.data.productPrice, start_date: parsed.data.startDate,
    end_date: parsed.data.endDate, is_active: true,
    click_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).select().single()

  if (error) return c.json({ error: 'مقدرناش ننشر العرض' }, 500)
  return c.json({ success: true, ad: data }, 201)
})

adminRouter.patch('/ads/:id', async (c) => {
  const adId = c.req.param('id')
  if (!adId || adId.length > 50) return c.json({ error: 'معرّف إعلان غير صحيح' }, 400)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    title: z.string().min(5).max(200).optional(),
    isActive: z.boolean().optional(),
    productPrice: z.number().positive().optional(),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'بيانات غير صحيحة' }, 400)

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.title !== undefined) dbUpdates.title = parsed.data.title
  if (parsed.data.isActive !== undefined) dbUpdates.is_active = parsed.data.isActive
  if (parsed.data.productPrice !== undefined) dbUpdates.product_price = parsed.data.productPrice

  const { error } = await supabase.from('ad_offers').update(dbUpdates).eq('id', adId)
  if (error) return c.json({ error: 'مقدرناش نحدث العرض' }, 500)
  return c.json({ success: true, message: 'تم التحديث' })
})

adminRouter.delete('/ads/:id', async (c) => {
  const adId = c.req.param('id')
  if (!adId || adId.length > 50) return c.json({ error: 'معرّف إعلان غير صحيح' }, 400)
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await supabase.from('ad_offers').delete().eq('id', adId)
  if (error) return c.json({ error: 'مقدرناش تحذف العرض' }, 500)
  return c.json({ success: true, message: 'تم حذف العرض' })
})

// =====================
// GET /admin/ads/:id/orders — الأوردرات الجاية من إعلان معين
// =====================
adminRouter.get('/ads/:id/orders', async (c) => {
  const adId = c.req.param('id')
  if (!adId || adId.length > 100) return c.json({ error: 'معرّف إعلان غير صحيح' }, 400)
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, delivery_fee, created_at,
      order_items(name, quantity, price, shop_name),
      users!orders_client_id_fkey(name, phone)
    `)
    .like('notes', `%adref_${adId}%`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[admin] ads orders error:', error)
    return c.json({ success: true, orders: [] })
  }
  return c.json({ success: true, orders: data || [] })
})
