// =============================================================
// Orders API - POST /orders, GET /orders/pending, POST /orders/:id/accept
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabaseClient } from '../lib/supabase'
import type { Env } from '../index'
import { requireRole } from '../middleware/auth'
import {
  acquireOrderLock,
  releaseOrderLock,
  cachePendingOrders,
  getCachedPendingOrders,
  invalidatePendingOrdersCache,
} from '../lib/kv-lock'
import { calculateDistance, calculateDeliveryFee, calculateShoppingFee, detectZone } from '../lib/pricing'

export const ordersRouter = new Hono<{ Bindings: Env }>()

// =====================
// Schema Validation
// =====================
const shopItemSchema = z.object({
  shopName: z.string().min(1).max(200),
  shopAddress: z.string().max(500).optional(),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().int().min(1).max(100).default(1),
    price: z.number().positive().optional(),
    description: z.string().max(500).optional(),
  })).min(1).max(20),
})

const createOrderSchema = z.discriminatedUnion('type', [
  // نوع 1: مشتريات من محلات (max 4 محلات)
  z.object({
    type: z.literal('SHOPPING'),
    shops: z.array(shopItemSchema).min(1).max(4, 'أقصى عدد محلات في أوردر واحد هو 4'),
    pickupLat: z.number().min(-90).max(90),
    pickupLng: z.number().min(-180).max(180),
    notes: z.string().max(1000).optional(),
    clientAddress: z.string().max(500).optional(),
  }),
  // نوع 2: توصيل من مكان لمكان
  z.object({
    type: z.literal('DELIVERY'),
    pickupAddress: z.string().min(5).max(500),
    pickupPhone: z.string().regex(/^01[0-9]{9}$/, 'رقم تليفون الاستلام غلط'),
    deliveryAddress: z.string().min(5).max(500),
    deliveryPhone: z.string().regex(/^01[0-9]{9}$/, 'رقم تليفون التسليم غلط'),
    pickupLat: z.number().min(-90).max(90),
    pickupLng: z.number().min(-180).max(180),
    deliveryLat: z.number().min(-90).max(90),
    deliveryLng: z.number().min(-180).max(180),
    notes: z.string().max(1000).optional(),
  }),
])

// =====================
// POST /orders - إنشاء أوردر جديد
// =====================
ordersRouter.post('/', requireRole('CLIENT', 'ADMIN'), async (c) => {
  const user = c.get('user')

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات JSON غير صحيحة' }, 400)
  }

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'بيانات الأوردر غلط', details: parsed.error.flatten() }, 400)
  }

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const zone = detectZone({ lat: parsed.data.pickupLat, lng: parsed.data.pickupLng })

  const { data: pricing } = await supabase
    .from('admin_pricing')
    .select('*')
    .eq('zone', zone)
    .eq('is_active', true)
    .single()

  if (!pricing) {
    return c.json({ error: 'منطقة التوصيل مش متاحة دلوقتي' }, 400)
  }

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  const orderId = crypto.randomUUID()

  let orderData: Record<string, unknown>
  let orderItems: { order_id: string; name: string; quantity: number; price?: number; shop_name: string; shop_address?: string }[] = []

  if (parsed.data.type === 'SHOPPING') {
    const { shops, pickupLat, pickupLng, notes, clientAddress } = parsed.data
    const numShops = shops.length
    const priceResult = calculateShoppingFee(numShops, pricing)

    orderData = {
      id: orderId,
      order_number: orderNumber,
      client_id: user.userId,
      type: 'SHOPPING',
      status: 'PENDING',
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      delivery_lat: pickupLat,
      delivery_lng: pickupLng,
      pickup_details: clientAddress || `عميل يطلب من ${numShops} محل`,
      delivery_details: clientAddress || '',
      distance_km: 0,
      delivery_fee: priceResult.finalFee,
      notes: notes || null,
      num_shops: numShops,
    }

    // تحويل الـ shops لـ order_items
    for (const shop of shops) {
      for (const item of shop.items) {
        orderItems.push({
          order_id: '',  // يتملى بعد إنشاء الأوردر
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          shop_name: shop.shopName,
          shop_address: shop.shopAddress,
        })
      }
    }

  } else {
    // DELIVERY
    const { pickupAddress, pickupPhone, deliveryAddress, deliveryPhone,
            pickupLat, pickupLng, deliveryLat, deliveryLng, notes } = parsed.data

    const distanceKm = calculateDistance(
      { lat: pickupLat, lng: pickupLng },
      { lat: deliveryLat, lng: deliveryLng }
    )
    const priceResult = calculateDeliveryFee(distanceKm, pricing)

    orderData = {
      id: orderId,
      order_number: orderNumber,
      client_id: user.userId,
      type: 'DELIVERY',
      status: 'PENDING',
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      delivery_lat: deliveryLat,
      delivery_lng: deliveryLng,
      pickup_details: `${pickupAddress} | تليفون: ${pickupPhone}`,
      delivery_details: `${deliveryAddress} | تليفون: ${deliveryPhone}`,
      recipient_phone: deliveryPhone,
      distance_km: distanceKm,
      delivery_fee: priceResult.finalFee,
      notes: notes || null,
      num_shops: 0,
    }
  }

  let { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  // لو فشل بسبب عمود ناقص (num_shops أو recipient_phone) → جرّب بدونهم
  if (orderError && (orderError.code === 'PGRST204' || orderError.message?.includes('column'))) {
    console.warn('Pre-migration fallback: removing unsupported columns from order insert')
    const fallbackData = { ...orderData }
    delete fallbackData.num_shops
    delete fallbackData.recipient_phone
    const fallback = await supabase
      .from('orders')
      .insert(fallbackData)
      .select()
      .single()
    order = fallback.data
    orderError = fallback.error
  }

  if (orderError || !order) {
    console.error('Order creation error:', orderError)
    return c.json({ error: 'مقدرناش ننشئ الأوردر' }, 500)
  }

  // إضافة الـ items
  if (orderItems.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(
      orderItems.map(item => ({ ...item, order_id: order.id }))
    )
    if (itemsError) {
      console.error('Order items error:', itemsError)
      await supabase.from('orders').delete().eq('id', order.id)
      return c.json({ error: 'مقدرناش نحفظ منتجات الأوردر' }, 500)
    }
  }

  await invalidatePendingOrdersCache(c.env.MANDOUBAK_KV)

  return c.json({ success: true, order, message: 'تم تسجيل الطلب بنجاح!' }, 201)
})

// =====================
// GET /orders/pending - الأوردرات المنتظرة (للمناديب)
// =====================
ordersRouter.get('/pending', requireRole('COURIER', 'ADMIN'), async (c) => {
  // تحقق من حالة المندوب
  const user = c.get('user')
  if (user.role === 'COURIER') {
    const supabaseCheck = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: courier } = await supabaseCheck
      .from('couriers')
      .select('status')
      .eq('user_id', user.userId)
      .single()

    if (!courier || courier.status !== 'APPROVED') {
      return c.json({
        success: false,
        error: 'لم يتم الموافقة على حسابك بعد',
        courierStatus: courier?.status || 'NOT_REGISTERED',
      }, 403)
    }
  }

  const cached = await getCachedPendingOrders(c.env.MANDOUBAK_KV)
  if (cached) {
    return c.json({ success: true, orders: cached.data, fromCache: true })
  }

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  let { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, type, status,
      pickup_lat, pickup_lng, delivery_lat, delivery_lng,
      pickup_details, delivery_details, recipient_phone,
      distance_km, delivery_fee, notes, num_shops,
      created_at,
      order_items (name, quantity, shop_name, shop_address)
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(50)

  // لو فشل بسبب أعمدة ناقصة → جرّب بدونهم
  if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
    const fallback = await supabase
      .from('orders')
      .select(`
        id, order_number, type, status,
        pickup_lat, pickup_lng, delivery_lat, delivery_lng,
        pickup_details, delivery_details,
        distance_km, delivery_fee, notes,
        created_at,
        order_items (name, quantity, shop_name)
      `)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(50)
    orders = fallback.data
    error = fallback.error
  }

  if (error) return c.json({ error: 'مقدرناش نجيب الأوردرات' }, 500)

  await cachePendingOrders(c.env.MANDOUBAK_KV, orders || [])

  return c.json({ success: true, orders: orders || [], fromCache: false })
})

// =====================
// POST /orders/:id/accept - قبول أوردر
// =====================
ordersRouter.post('/:id/accept', requireRole('COURIER'), async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('id')

  if (!orderId || orderId.length > 50) {
    return c.json({ error: 'معرّف أوردر غير صحيح' }, 400)
  }

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: courier } = await supabase
    .from('couriers')
    .select('id, status')
    .eq('user_id', user.userId)
    .single()

  if (!courier) return c.json({ error: 'بروفايل المندوب مش موجود' }, 400)
  if (courier.status !== 'APPROVED') {
    return c.json({ error: 'حسابك لسه تحت المراجعة' }, 403)
  }

  const lockResult = await acquireOrderLock(c.env.MANDOUBAK_KV, orderId, courier.id)
  if (!lockResult.acquired) {
    return c.json({ success: false, error: 'الأوردر اتحجز من مندوب تاني', message: lockResult.reason }, 409)
  }

  try {
    const { data: result, error } = await supabase
      .rpc('accept_order', { p_order_id: orderId, p_courier_id: courier.id })

    if (error) {
      await releaseOrderLock(c.env.MANDOUBAK_KV, orderId)
      return c.json({ error: 'خطأ في قبول الأوردر' }, 500)
    }

    if (!result.success) {
      await releaseOrderLock(c.env.MANDOUBAK_KV, orderId)
      return c.json({ success: false, error: result.message }, 409)
    }

    await invalidatePendingOrdersCache(c.env.MANDOUBAK_KV)
    await releaseOrderLock(c.env.MANDOUBAK_KV, orderId)

    return c.json({ success: true, message: 'تم قبول الأوردر بنجاح!', orderId })
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
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  let query
  if (user.role === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers').select('id').eq('user_id', user.userId).single()
    if (!courier) return c.json({ success: true, orders: [] })
    query = supabase.from('orders')
      .select('*, order_items(*)')
      .eq('courier_id', courier.id)
  } else {
    query = supabase.from('orders')
      .select('*, order_items(*), couriers(name, phone, rating)')
      .eq('client_id', user.userId)
  }

  const { data: orders, error } = await query
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return c.json({ error: 'مقدرناش نجيب الأوردرات' }, 500)
  return c.json({ success: true, orders: orders || [] })
})

// =====================
// PATCH /orders/:id/status - تحديث حالة الأوردر
// =====================
ordersRouter.patch('/:id/status', requireRole('COURIER', 'ADMIN'), async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('id')

  if (!orderId || orderId.length > 50) {
    return c.json({ error: 'معرّف أوردر غير صحيح' }, 400)
  }

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ error: 'بيانات غير صحيحة' }, 400)
  }

  const schema = z.object({ status: z.enum(['PICKED_UP', 'DELIVERED', 'CANCELLED']) })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'حالة غير صحيحة' }, 400)

  const { status } = parsed.data
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  if (user.role === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers').select('id').eq('user_id', user.userId).single()
    if (!courier) return c.json({ error: 'بروفايل المندوب مش موجود' }, 400)

    const { data: order } = await supabase
      .from('orders').select('id, courier_id, status')
      .eq('id', orderId).eq('courier_id', courier.id).single()
    if (!order) return c.json({ error: 'الأوردر مش موجود أو مش بتاعك' }, 404)
  }

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'DELIVERED') updates.completed_at = new Date().toISOString()
  if (status === 'CANCELLED') updates.cancelled_at = new Date().toISOString()

  const { error } = await supabase.from('orders').update(updates).eq('id', orderId)
  if (error) return c.json({ error: 'مقدرناش نحدث الحالة' }, 500)

  if (status === 'DELIVERED' && user.role === 'COURIER') {
    const { data: courier } = await supabase
      .from('couriers').select('id, total_deliveries').eq('user_id', user.userId).single()
    if (courier) {
      await supabase.from('couriers')
        .update({ total_deliveries: (courier.total_deliveries || 0) + 1 })
        .eq('id', courier.id)
    }
  }

  return c.json({ success: true, message: 'تم تحديث الحالة' })
})
