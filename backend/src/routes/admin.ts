// =============================================================
// Admin API - لوحة تحكم الأدمن
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../index'
import { requireRole } from '../middleware/auth'

export const adminRouter = new Hono<{ Bindings: Env }>()

// كل الـ routes دي للأدمن بس
adminRouter.use('*', requireRole('ADMIN'))

// =====================
// GET /admin/dashboard - إحصائيات عامة
// =====================
adminRouter.get('/dashboard', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const [ordersStats, couriersStats, adsStats, revenueStats] = await Promise.all([
    supabase.from('orders').select('status', { count: 'exact' }),
    supabase.from('couriers').select('status', { count: 'exact' }),
    supabase.from('ad_offers').select('is_active, click_count'),
    supabase.from('orders')
      .select('delivery_fee')
      .eq('status', 'DELIVERED'),
  ])

  const orders = ordersStats.data || []
  const couriers = couriersStats.data || []
  const ads = adsStats.data || []
  const revenue = revenueStats.data || []

  const totalRevenue = revenue.reduce((sum, o) => sum + (o.delivery_fee || 0), 0)

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
      ads: {
        total: ads.length,
        active: ads.filter(a => a.is_active).length,
        totalClicks: ads.reduce((sum, a) => sum + (a.click_count || 0), 0),
      },
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        currency: 'EGP',
      },
    }
  })
})

// =====================
// GET /admin/couriers - كل المناديب
// =====================
adminRouter.get('/couriers', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const status = c.req.query('status')

  // Validate status param
  const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']
  if (status && !validStatuses.includes(status)) {
    return c.json({ error: 'حالة غير صحيحة' }, 400)
  }

  let query = supabase
    .from('couriers')
    .select('id, name, phone, address, status, rating, total_deliveries, is_online, created_at, users(email, clerk_id)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return c.json({ error: 'مقدرناش نجيب المناديب' }, 500)
  }

  return c.json({ success: true, couriers: data || [] })
})

// =====================
// PATCH /admin/couriers/:id/approve - الموافقة/الرفض على مندوب
// =====================
adminRouter.patch('/couriers/:id/approve', async (c) => {
  const courierId = c.req.param('id')

  if (!courierId || courierId.length > 30) {
    return c.json({ error: 'معرّف مندوب غير صحيح' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
    reason: z.string().max(500).optional(),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'حالة غير صحيحة', details: parsed.error.flatten() }, 400)
  }

  const { status } = parsed.data
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from('couriers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', courierId)

  if (error) {
    return c.json({ error: 'مقدرناش نحدث الحالة' }, 500)
  }

  return c.json({
    success: true,
    message: status === 'APPROVED'
      ? 'تم الموافقة على المندوب'
      : status === 'REJECTED'
      ? 'تم رفض المندوب'
      : 'تم إيقاف المندوب'
  })
})

// =====================
// GET /admin/orders - كل الأوردرات
// =====================
adminRouter.get('/orders', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
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
      id, order_number, type, status, delivery_fee, distance_km,
      pickup_details, delivery_details, notes, created_at, accepted_at, completed_at,
      order_items(name, quantity, price, shop_name),
      couriers(name, phone),
      users!orders_client_id_fkey(email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    return c.json({ error: 'مقدرناش نجيب الأوردرات' }, 500)
  }

  return c.json({
    success: true,
    orders: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  })
})

// =====================
// Pricing Management - إدارة الأسعار
// =====================
adminRouter.get('/pricing', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('admin_pricing').select('*').order('zone')

  if (error) return c.json({ error: 'مقدرناش نجيب الأسعار' }, 500)
  return c.json({ success: true, pricing: data || [] })
})

const pricingSchema = z.object({
  zone: z.string().min(2).max(100),
  pricePerKm: z.number().positive().max(1000),
  minimumFee: z.number().positive().max(10000),
  maximumFee: z.number().positive().max(10000).optional(),
  isActive: z.boolean().default(true),
})

adminRouter.post('/pricing', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const parsed = pricingSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'بيانات غلط', details: parsed.error.flatten() }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('admin_pricing')
    .upsert({
      zone: parsed.data.zone,
      price_per_km: parsed.data.pricePerKm,
      minimum_fee: parsed.data.minimumFee,
      maximum_fee: parsed.data.maximumFee,
      is_active: parsed.data.isActive,
    }, { onConflict: 'zone' })
    .select()
    .single()

  if (error) return c.json({ error: 'مقدرناش نحفظ السعر' }, 500)
  return c.json({ success: true, pricing: data })
})

// =====================
// Ads/Offers Management - إدارة العروض
// =====================
adminRouter.get('/ads', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
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
  imageUrl: z.string().url().max(2000),
  shopName: z.string().min(3).max(200),
  shopAddress: z.string().min(10).max(500),
  shopLat: z.number().min(-90).max(90),
  shopLng: z.number().min(-180).max(180),
  productName: z.string().min(3).max(200),
  productPrice: z.number().positive().max(100000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

adminRouter.post('/ads', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const parsed = adSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'بيانات العرض غلط', details: parsed.error.flatten() }, 400)
  }

  // Validate date range
  if (new Date(parsed.data.endDate) <= new Date(parsed.data.startDate)) {
    return c.json({ error: 'تاريخ الانتهاء لازم يكون بعد تاريخ البداية' }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('ad_offers')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      image_url: parsed.data.imageUrl,
      shop_name: parsed.data.shopName,
      shop_address: parsed.data.shopAddress,
      shop_lat: parsed.data.shopLat,
      shop_lng: parsed.data.shopLng,
      product_name: parsed.data.productName,
      product_price: parsed.data.productPrice,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      is_active: true,
    })
    .select()
    .single()

  if (error) return c.json({ error: 'مقدرناش ننشر العرض' }, 500)
  return c.json({ success: true, ad: data }, 201)
})

// PATCH /admin/ads/:id - تعديل عرض (fields محددة بس)
const adUpdateSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().max(2000).optional(),
  shopName: z.string().min(3).max(200).optional(),
  shopAddress: z.string().min(10).max(500).optional(),
  shopLat: z.number().min(-90).max(90).optional(),
  shopLng: z.number().min(-180).max(180).optional(),
  productName: z.string().min(3).max(200).optional(),
  productPrice: z.number().positive().max(100000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
}).strict()  // رفض أي fields زيادة

adminRouter.patch('/ads/:id', async (c) => {
  const adId = c.req.param('id')

  if (!adId || adId.length > 30) {
    return c.json({ error: 'معرّف إعلان غير صحيح' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const parsed = adUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, 400)
  }

  if (Object.keys(parsed.data).length === 0) {
    return c.json({ error: 'مفيش بيانات للتحديث' }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // Map camelCase to snake_case explicitly (no raw spread)
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.title !== undefined) dbUpdates.title = parsed.data.title
  if (parsed.data.description !== undefined) dbUpdates.description = parsed.data.description
  if (parsed.data.imageUrl !== undefined) dbUpdates.image_url = parsed.data.imageUrl
  if (parsed.data.shopName !== undefined) dbUpdates.shop_name = parsed.data.shopName
  if (parsed.data.shopAddress !== undefined) dbUpdates.shop_address = parsed.data.shopAddress
  if (parsed.data.shopLat !== undefined) dbUpdates.shop_lat = parsed.data.shopLat
  if (parsed.data.shopLng !== undefined) dbUpdates.shop_lng = parsed.data.shopLng
  if (parsed.data.productName !== undefined) dbUpdates.product_name = parsed.data.productName
  if (parsed.data.productPrice !== undefined) dbUpdates.product_price = parsed.data.productPrice
  if (parsed.data.startDate !== undefined) dbUpdates.start_date = parsed.data.startDate
  if (parsed.data.endDate !== undefined) dbUpdates.end_date = parsed.data.endDate
  if (parsed.data.isActive !== undefined) dbUpdates.is_active = parsed.data.isActive

  const { error } = await supabase
    .from('ad_offers')
    .update(dbUpdates)
    .eq('id', adId)

  if (error) return c.json({ error: 'مقدرناش نحدث العرض' }, 500)
  return c.json({ success: true, message: 'تم التحديث' })
})

// DELETE /admin/ads/:id - حذف عرض
adminRouter.delete('/ads/:id', async (c) => {
  const adId = c.req.param('id')

  if (!adId || adId.length > 30) {
    return c.json({ error: 'معرّف إعلان غير صحيح' }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from('ad_offers')
    .delete()
    .eq('id', adId)

  if (error) return c.json({ error: 'مقدرناش تحذف العرض' }, 500)
  return c.json({ success: true, message: 'تم حذف العرض' })
})
