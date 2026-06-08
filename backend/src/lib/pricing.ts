// =============================================================
// Pricing Calculator - حساب سعر التوصيل بـ Haversine Formula
// =============================================================

export type Coordinates = {
  lat: number
  lng: number
}

export type PricingZone = {
  zone: string
  price_per_km: number
  minimum_fee: number
  maximum_fee?: number | null
}

export type DeliveryPriceResult = {
  distanceKm: number
  zone: string
  pricePerKm: number
  minimumFee: number
  calculatedFee: number
  finalFee: number
  breakdown: string
}

/**
 * Haversine Formula - يحسب المسافة بين نقطتين على كرة الأرض
 * النتيجة بالكيلومتر
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371  // نصف قطر الأرض بالكيلومتر
  
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 100) / 100  // تقريب لـ 2 decimals
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * يحسب سعر التوصيل بناءً على المسافة ومنطقة التسعير
 */
export function calculateDeliveryFee(
  distanceKm: number,
  pricingZone: PricingZone
): DeliveryPriceResult {
  const calculatedFee = distanceKm * pricingZone.price_per_km
  
  let finalFee = Math.max(calculatedFee, pricingZone.minimum_fee)
  
  if (pricingZone.maximum_fee) {
    finalFee = Math.min(finalFee, pricingZone.maximum_fee)
  }
  
  finalFee = Math.ceil(finalFee)  // تقريب للأعلى لصالح المندوب
  
  return {
    distanceKm,
    zone: pricingZone.zone,
    pricePerKm: pricingZone.price_per_km,
    minimumFee: pricingZone.minimum_fee,
    calculatedFee: Math.round(calculatedFee * 100) / 100,
    finalFee,
    breakdown: `${distanceKm} كم × ${pricingZone.price_per_km} جنيه = ${calculatedFee.toFixed(2)} جنيه (الحد الأدنى: ${pricingZone.minimum_fee} جنيه)`
  }
}

/**
 * يحدد المنطقة بناءً على الـ coordinates (تقدر تعدل الـ zones حسب مدينتك)
 */
export function detectZone(coords: Coordinates): string {
  // مثال للقاهرة - عدل الـ boundaries حسب مدينتك
  // القاهرة الكبرى
  if (coords.lat >= 29.8 && coords.lat <= 30.2 && 
      coords.lng >= 31.0 && coords.lng <= 31.5) {
    return 'cairo'
  }
  // الجيزة
  if (coords.lat >= 29.9 && coords.lat <= 30.1 && 
      coords.lng >= 30.8 && coords.lng <= 31.1) {
    return 'giza'
  }
  // افتراضي
  return 'default'
}
