// =============================================================
// Pricing API - حساب سعر التوصيل
// =============================================================

import { Hono } from 'hono'
import { z } from 'zod'
import { getSupabaseClient } from '../lib/supabase'
import type { Env } from '../index'
import { calculateDistance, calculateDeliveryFee, detectZone } from '../lib/pricing'

export const pricingRouter = new Hono<{ Bindings: Env }>()

// =====================
// GET /pricing/calculate?pickupLat=&pickupLng=&deliveryLat=&deliveryLng=
// =====================
pricingRouter.get('/calculate', async (c) => {
  const pickupLat = parseFloat(c.req.query('pickupLat') || '')
  const pickupLng = parseFloat(c.req.query('pickupLng') || '')
  const deliveryLat = parseFloat(c.req.query('deliveryLat') || '')
  const deliveryLng = parseFloat(c.req.query('deliveryLng') || '')

  if ([pickupLat, pickupLng, deliveryLat, deliveryLng].some(isNaN)) {
    return c.json({ error: 'الإحداثيات ناقصة أو غلط' }, 400)
  }

  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  // تحديد المنطقة
  const zone = detectZone({ lat: pickupLat, lng: pickupLng })

  // جيب سعر المنطقة
  const { data: pricing } = await supabase
    .from('admin_pricing')
    .select('*')
    .eq('zone', zone)
    .eq('is_active', true)
    .single()

  // لو منطقة مش موجودة، استخدم الـ default
  const { data: defaultPricing } = !pricing
    ? await supabase.from('admin_pricing').select('*').eq('zone', 'default').single()
    : { data: null }

  const activePricing = pricing || defaultPricing

  if (!activePricing) {
    return c.json({ error: 'التوصيل لهذه المنطقة غير متاح حالياً' }, 404)
  }

  const distanceKm = calculateDistance(
    { lat: pickupLat, lng: pickupLng },
    { lat: deliveryLat, lng: deliveryLng }
  )

  const result = calculateDeliveryFee(distanceKm, activePricing)

  return c.json({
    success: true,
    estimate: {
      distanceKm: result.distanceKm,
      zone: result.zone,
      deliveryFee: result.finalFee,
      breakdown: result.breakdown,
      currency: 'EGP',
      note: 'السعر تقريبي وقد يختلف حسب ظروف التوصيل'
    }
  })
})

// =====================
// GET /pricing/zones - كل مناطق التسعير
// =====================
pricingRouter.get('/zones', async (c) => {
  const supabase = getSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase
    .from('admin_pricing')
    .select('zone, price_per_km, minimum_fee, maximum_fee')
    .eq('is_active', true)
    .order('zone')

  if (error) {
    return c.json({ error: 'مقدرناش نجيب المناطق' }, 500)
  }

  return c.json({ success: true, zones: data || [] })
})
