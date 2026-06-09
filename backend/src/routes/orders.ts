// =============================================================
// Orders API - POST /orders, GET /orders/pending, POST /orders/:id/accept
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../index'
import { requireRole } from '../middleware/auth'
import {
  acquireOrderLock,
  releaseOrderLock,
  cachePendingOrders,
  getCachedPendingOrders,
  invalidatePendingOrdersCache,
} from '../lib/kv-lock'
import { calculateDistance, calculateDeliveryFee, detectZone } from '../lib/pricing'

export const ordersRouter = new Hono<{ Bindings: Env }>()

// =====================
// Schema Validation
// =====================
const createOrderSchema = z.object({
  type: z.enum(['SHOPPING', 'DELIVERY']),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  deliveryLat: z.number().min(-90).max(90),
  deliveryLng: z.number().min(-180).max(180),
  pickupDetails: z.string().max(500).optional(),
  deliveryDetails: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    quantity: z.number().int().min(1).max(100).default(1),
    price: z.number().positive().optional(),
    shopName: z.string().max(200).optional(),
    shopAddress: z.string().max(500).optional(),
  })).max(50).optional(),  // max 50 items per order
  adOfferId: z.string().cuid().optional(),
})

// =====================
// POST /orders - إنشاء أوردر جديد
// =====================
ordersRouter.post('/', async (c) => {
  const user = c.get('user')

  // Only clients can create orders
  if (user.role !== 'CLIENT' && user.role !== 'ADMIN') {
    return c.json({ error: 'العملاء بس اللي بيطلبوا' }, 403)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'بيانات JSON غير صحيحة' }, 400)
  }

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'بيانات غلط', details: parsed.error.flatten() }, 400)
  }

  const { type, pickupLat, pickupLng, deliveryLat, deliveryLng,
    pickupDetails, deliveryDetails, notes, items, adOfferId } = parsed.data

  // Validate pickup ≠ delivery
  if (Math.abs(pickupLat - deliveryLat) < 0.0001 && Math.abs(pickupLng - deliveryLng) < 0.0001) {
    return c.json({ error: 'عنوان الاستلام والتوصيل لازم يكونوا مختلفين' }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // حساب المسافة وسعر التوصيل
  const distanceKm = calculateDistance(
    { lat: pickupLat, lng: pickupLng },
    { lat: deliveryLat, lng: deliveryLng }
  )

  const zone = detectZone({ lat: pickupLat, lng: pickupLng })

  const { data: pricing } = await supabase
    .from('admin_pricing')
    .select('*')
    .eq('zone', zone)
    .eq('is_active', true)
    .single()

  if (!pricing) {
    return c.json({ error: 'منطقة التوصيل مش متاحة دلوقتي' }, 400)
  }

  const priceResult = calculateDeliveryFee(distanceKm, pricing)

  // إنشاء رقم أوردر فريد
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  // إنشاء الأوردر في الـ database
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      client_id: user.userId,
      type,
      status: 'PENDING',
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      delivery_lat: deliveryLat,
      delivery_lng: deliveryLng,
      pickup_details: pickupDetails,
      delivery_details: deliveryDetails,
      distance_km: distanceKm,
      delivery_fee: priceResult.finalFee,
      notes,
      ad_offer_id: adOfferId || null,
    })
    .select()
    .single()

  if (orderError) {
    console.error('Order creation error:', orderError)
    return c.json({ error: 'مقدرناش ننشئ الأوردر' }, 500)
  }

  // إضافة الـ items لو موجودة
  if (items && items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map(item => ({
        order_id: order.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        shop_name: item.shopName,
        shop_address: item.shopAddress,
      }))
    )
    if (itemsError) {
      console.error('Order items error:', itemsError)
      // Rollback the order if items fail
      await supabase.from('orders').delete().eq('id', order.id)
      return c.json({ error: 'مقدرناش نحفظ منتجات الأوردر' }, 500)
    }
  }

  // مسح الـ cache عشان المناديب يشوفوا الأوردر الجديد فوراً
  await invalidatePendingOrdersCache(c.env.MANDOUBAK_KV)

  return c.json({
    success: true,
    order: {
      ...order,
      deliveryFee: priceResult.finalFee,
      distanceKm,
      priceBreakdown: priceResult.breakdown,
    }
  }, 201)
})

// =====================
// GET /orders/pending - الأوردرات المنتظرة (للمناديب)
// =====================
ordersRouter.get('/pending', requireRole('COURIER', 'ADMIN'), async (c) => {
  // الأول جرب الـ Cache (3 ثواني)
  const cached = await getCachedPendingOrders(c.env.MANDOUBAK_KV)
  if (cached) {
    return c.json({
      success: true,
      orders: cached.data,
      fromCache: true,
      cachedAt: new Date(cached.cachedAt).toISOString()
    })
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, type, status,
      pickup_lat, pickup_lng, delivery_lat, delivery_lng,
      pickup_details, delivery_details,
      distance_km, delivery_fee, notes,
      created_at,
      order_items (name, quantity, shop_name, shop_address),
      ad_offers (title, shop_name, product_name)
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return c.json({ error: 'مقدرناش نجيب الأوردرات' }, 500)
  }

  // Cache النتايج لمدة 3 ثواني
  await cachePendingOrders(c.env.MANDOUBAK_KV, orders || [])

  return c.json({
    success: true,
    orders: orders || [],
    fromCache: false,
    fetchedAt: new Date().toISOString()
  })
})

// =====================
// POST /orders/:id/accept - قبول أوردر (منع Race Condition)
// =====================
ordersRouter.post('/:id/accept', requireRole('COURIER'), async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('id')

  if (!orderId || orderId.length > 30) {
    return c.json({ error: 'معرّف أوردر غير صحيح' }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // جيب الـ courier_id من الـ database
  const { data: courier } = await supabase
    .from('couriers')
    .select('id, status')
    .eq('user_id', user.userId)
    .single()

  if (!courier) {
    return c.json({ error: 'بروفايل المندوب مش موجود' }, 400)
  }

  if (courier.status !== 'APPROVED') {
    return c.json({ error: 'حسابك لسه تحت المراجعة' }, 403)
  }

  // Step 1: KV Lock (منع السباق على مستوى الـ Edge)
  const lockResult = await acquireOrderLock(c.env.MANDOUBAK_KV, orderId, courier.id)

  if (!lockResult.acquired) {
    return c.json({
      success: false,
      error: 'الأوردر اتحجز',
      message: lockResult.reason
    }, 409)
  }

  try {
    // Step 2: Atomic Transaction في Supabase (منع السباق على مستوى الـ DB)
    const { data: result, error } = await supabase
      .rpc('accept_order', {
        p_order_id: orderId,
        p_courier_id: courier.id
      })

    if (error) {
      await releaseOrderLock(c.env.MANDOUBAK_KV, orderId)
      return c.json({ error: 'خطأ في قبول الأوردر' }, 500)
    }

    if (!result.success) {
      await releaseOrderLock(c.env.MANDOUBAK_KV, orderId)
      return c.json({
        success: false,
        error: result.message
      }, 409)
    }

    // Step 3: مسح الـ Cache فوراً عشان الأوردر يختفي من المناديب
    await invalidatePendingOrdersCache(c.env.MANDOUBAK_KV)

    // Step 4: فك الـ lock بعد ما التحديث اتعمل
    await releaseOrderLock(c.env.MANDOUBAK_KV, orderId)

    return c.json({
      success: true,
      message: 'تم قبول الأوردر بنجاح!',
      orderId,
    })

  } catch (err) {
    await releaseOrderLock(c.env.MANDOUBAK_KV, orderId)
    return c.json({ error: 'خطأ غير متوقع' }, 500)
  }
})

// =====================
// GET /orders/my - أوردرات اليوزر الحالي
// =====================
ordersRouter.get('/my', async (c) => {
  const user = c.get('user')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const query = user.role === 'COURIER'
    ? supabase.from('orders').select(`
        *, order_items(*), ad_offers(title, shop_name)
      `).eq('courier_id', (await supabase.from('couriers').select('id').eq('user_id', user.userId).single()).data?.id)
    : supabase.from('orders').select(`
        *, order_items(*), ad_offers(title, shop_name), couriers(name, phone, rating)
      `).eq('client_id', user.userId)

  const { data: orders, error } = await query
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return c.json({ error: 'مقدرناش نجيب الأوردرات' }, 500)
  }

  return c.json({ success: true, orders: orders || [] })
})

// =====================
// PATCH /orders/:id/status - تحديث حالة الأوردر
// =====================
ordersRouter.patch('/:id/status', requireRole('COURIER', 'ADMIN'), async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('id')

  if (!orderId || orderId.length > 30) {
    return c.json({ error: 'معرّف أوردر غير صحيح' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({
    status: z.enum(['PICKED_UP', 'DELIVERED', 'CANCELLED']),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'حالة غير صحيحة' }, 400)
  }

  const { status } = parsed.data
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // التحقق من ownership - المندوب يعدّل أوردراته بس
  if (user.role === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers')
      .select('id')
      .eq('user_id', user.userId)
      .single()

    if (!courier) {
      return c.json({ error: 'بروفايل المندوب مش موجود' }, 400)
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, courier_id, status')
      .eq('id', orderId)
      .eq('courier_id', courier.id)  // المندوب بيعدّل أوردره هو بس
      .single()

    if (!order) {
      return c.json({ error: 'الأوردر مش موجود أو مش بتاعك' }, 404)
    }

    // منع المندوب من إلغاء أوردر مش ACCEPTED
    if (status === 'CANCELLED' && order.status !== 'ACCEPTED') {
      return c.json({ error: 'مقدرش تلغي الأوردر في الحالة دي' }, 400)
    }
  }

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'DELIVERED') updates.completed_at = new Date().toISOString()
  if (status === 'CANCELLED') updates.cancelled_at = new Date().toISOString()

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)

  if (error) {
    return c.json({ error: 'مقدرناش نحدث الحالة' }, 500)
  }

  // لو تم التوصيل، زوّد عداد التوصيلات للمندوب
  if (status === 'DELIVERED' && user.role === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers')
      .select('id, total_deliveries')
      .eq('user_id', user.userId)
      .single()

    if (courier) {
      await supabase
        .from('couriers')
        .update({ total_deliveries: (courier.total_deliveries || 0) + 1 })
        .eq('id', courier.id)
    }
  }

  return c.json({ success: true, message: 'تم تحديث الحالة' })
})
