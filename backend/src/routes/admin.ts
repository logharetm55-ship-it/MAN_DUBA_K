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

  const [ordersStats, couriersStats, adsStats] = await Promise.all([
    supabase.from('orders').select('status', { count: 'exact' }),
    supabase.from('couriers').select('status', { count: 'exact' }),
    supabase.from('ad_offers').select('is_active, click_count'),
  ])

  const orders = ordersStats.data || []
  const couriers = couriersStats.data || []
  const ads = adsStats.data || []

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
      }
    }
  })
})

// =====================
// GET /admin/couriers - كل المناديب
// =====================
adminRouter.get('/couriers', async (c) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const status = c.req.query('status')

  let query = supabase
    .from('couriers')
    .select('*, users(email, clerk_id)')
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
  const { status, reason } = await c.req.json()

  const validStatuses = ['APPROVED', 'REJECTED', 'SUSPENDED']
  if (!validStatuses.includes(status)) {
    return c.json({ error: 'حالة غير صحيحة' }, 400)
  }

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
  const page = parseInt(c.req.query('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('orders')
    .select(`
      *, 
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
  zone: z.string().min(2),
  pricePerKm: z.number().positive(),
  minimumFee: z.number().positive(),
  maximumFee: z.number().positive().optional(),
  isActive: z.boolean().default(true),
})

adminRouter.post('/pricing', async (c) => {
  const body = await c.req.json()
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
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: 'مقدرناش نجيب العروض' }, 500)
  return c.json({ success: true, ads: data || [] })
})

const adSchema = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  imageUrl: z.string().url(),
  shopName: z.string().min(3),
  shopAddress: z.string().min(10),
  shopLat: z.number(),
  shopLng: z.number(),
  productName: z.string().min(3),
  productPrice: z.number().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

adminRouter.post('/ads', async (c) => {
  const body = await c.req.json()
  const parsed = adSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'بيانات العرض غلط', details: parsed.error.flatten() }, 400)
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

adminRouter.patch('/ads/:id', async (c) => {
  const adId = c.req.param('id')
  const updates = await c.req.json()
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from('ad_offers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', adId)

  if (error) return c.json({ error: 'مقدرناش نحدث العرض' }, 500)
  return c.json({ success: true, message: 'تم التحديث' })
})
