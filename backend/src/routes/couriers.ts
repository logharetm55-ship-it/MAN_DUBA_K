// =============================================================
// Couriers API - تسجيل وإدارة المناديب
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../index'
import { requireRole } from '../middleware/auth'

export const couriersRouter = new Hono<{ Bindings: Env }>()

// =====================
// POST /couriers/register - تسجيل مندوب جديد
// =====================
couriersRouter.post('/register', async (c) => {
  const user = c.get('user')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const body = await c.req.json()

  const schema = z.object({
    name: z.string().min(3),
    phone: z.string().regex(/^01[0-9]{9}$/, 'رقم موبايل مصري غير صحيح'),
    address: z.string().min(10),
    idFrontKey: z.string(),  // مفتاح صورة R2
    idBackKey: z.string(),   // مفتاح صورة R2
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'بيانات غير صحيحة', details: parsed.error.flatten() }, 400)
  }

  const { name, phone, address, idFrontKey, idBackKey } = parsed.data

  // التحقق إن رقم الموبايل مش موجود (منع التكرار)
  const { data: existing } = await supabase
    .from('couriers')
    .select('id, phone')
    .eq('phone', phone)
    .single()

  if (existing) {
    return c.json({ 
      error: 'رقم الموبايل ده مسجل بالفعل',
      message: 'كل مندوب له رقم موبايل واحد بس' 
    }, 409)
  }

  // التحقق إن المندوب مش مسجل بالفعل
  const { data: existingCourier } = await supabase
    .from('couriers')
    .select('id')
    .eq('user_id', user.userId)
    .single()

  if (existingCourier) {
    return c.json({ error: 'انت مسجل كمندوب بالفعل' }, 409)
  }

  // تحديث role في جدول users
  await supabase
    .from('users')
    .update({ role: 'COURIER', phone })
    .eq('id', user.userId)

  // إنشاء بروفايل المندوب
  const { data: courier, error } = await supabase
    .from('couriers')
    .insert({
      user_id: user.userId,
      name,
      phone,
      address,
      id_front_image_url: idFrontKey,
      id_back_image_url: idBackKey,
      status: 'PENDING_REVIEW',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return c.json({ error: 'رقم الموبايل مكرر' }, 409)
    }
    console.error('Courier registration error:', error)
    return c.json({ error: 'مقدرناش نسجل بياناتك' }, 500)
  }

  return c.json({
    success: true,
    message: 'تم التسجيل! بياناتك تحت المراجعة، هنتواصل معاك خلال 24 ساعة.',
    courier: {
      id: courier.id,
      name: courier.name,
      status: courier.status,
    }
  }, 201)
})

// =====================
// GET /couriers/profile - بروفايل المندوب
// =====================
couriersRouter.get('/profile', requireRole('COURIER'), async (c) => {
  const user = c.get('user')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: courier, error } = await supabase
    .from('couriers')
    .select(`
      id, name, phone, address, status, rating, 
      total_deliveries, is_online, created_at,
      courier_ratings(rating, comment, created_at)
    `)
    .eq('user_id', user.userId)
    .single()

  if (error || !courier) {
    return c.json({ error: 'بروفايل مش موجود' }, 404)
  }

  // حساب متوسط التقييم
  const ratings = (courier.courier_ratings as { rating: number }[]) || []
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : 0

  return c.json({
    success: true,
    courier: {
      ...courier,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length,
    }
  })
})

// =====================
// PATCH /couriers/online-status - تغيير حالة الاتاحة
// =====================
couriersRouter.patch('/online-status', requireRole('COURIER'), async (c) => {
  const user = c.get('user')
  const { isOnline } = await c.req.json()
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase
    .from('couriers')
    .update({ is_online: isOnline, updated_at: new Date().toISOString() })
    .eq('user_id', user.userId)

  if (error) {
    return c.json({ error: 'مقدرناش نحدث الحالة' }, 500)
  }

  return c.json({
    success: true,
    message: isOnline ? 'انت دلوقتي متاح للطلبات' : 'تم إيقاف استقبال الطلبات'
  })
})

// =====================
// POST /couriers/rate/:orderId - تقييم المندوب
// =====================
couriersRouter.post('/rate/:orderId', async (c) => {
  const user = c.get('user')
  const orderId = c.req.param('orderId')
  const { rating, comment } = await c.req.json()

  if (rating < 1 || rating > 5) {
    return c.json({ error: 'التقييم لازم يكون من 1 لـ 5' }, 400)
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // التحقق إن الأوردر بتاع اليوزر ده ومكتمل
  const { data: order } = await supabase
    .from('orders')
    .select('id, courier_id, status')
    .eq('id', orderId)
    .eq('client_id', user.userId)
    .single()

  if (!order) {
    return c.json({ error: 'الأوردر مش موجود' }, 404)
  }

  if (order.status !== 'DELIVERED') {
    return c.json({ error: 'الأوردر مش متسلم لحد دلوقتي' }, 400)
  }

  if (!order.courier_id) {
    return c.json({ error: 'مفيش مندوب على الأوردر ده' }, 400)
  }

  // إضافة التقييم
  const { error: ratingError } = await supabase
    .from('courier_ratings')
    .insert({
      courier_id: order.courier_id,
      order_id: orderId,
      rating,
      comment,
    })

  if (ratingError) {
    if (ratingError.code === '23505') {
      return c.json({ error: 'انت قيمت الأوردر ده قبل كده' }, 409)
    }
    return c.json({ error: 'مقدرناش نحفظ التقييم' }, 500)
  }

  // تحديث متوسط التقييم على بروفايل المندوب
  const { data: allRatings } = await supabase
    .from('courier_ratings')
    .select('rating')
    .eq('courier_id', order.courier_id)

  if (allRatings && allRatings.length > 0) {
    const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
    await supabase
      .from('couriers')
      .update({ rating: Math.round(avg * 10) / 10 })
      .eq('id', order.courier_id)
  }

  return c.json({ success: true, message: 'شكراً على تقييمك!' })
})
