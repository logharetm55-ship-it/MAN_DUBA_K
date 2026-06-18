// =============================================================
// Pricing Calculator - حساب سعر التوصيل
// SHOPPING: بناءً على عدد المحلات
// DELIVERY: بناءً على المسافة (Haversine)
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
  price_per_shop?: number | null
  base_fee_shopping?: number | null
}

export type DeliveryPriceResult = {
  distanceKm: number
  zone: string
  finalFee: number
  breakdown: string
}

export type ShoppingPriceResult = {
  numShops: number
  zone: string
  finalFee: number
  breakdown: string
}

export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 100) / 100
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// حساب سعر أوردر التوصيل (بالمسافة)
export function calculateDeliveryFee(
  distanceKm: number,
  pricingZone: PricingZone
): DeliveryPriceResult {
  const calculatedFee = distanceKm * pricingZone.price_per_km
  let finalFee = Math.max(calculatedFee, pricingZone.minimum_fee)
  if (pricingZone.maximum_fee) finalFee = Math.min(finalFee, pricingZone.maximum_fee)
  finalFee = Math.ceil(finalFee)

  return {
    distanceKm,
    zone: pricingZone.zone,
    finalFee,
    breakdown: `${distanceKm} كم × ${pricingZone.price_per_km} جنيه = ${Math.round(calculatedFee)} جنيه (أدنى: ${pricingZone.minimum_fee} جنيه)`,
  }
}

// حساب سعر أوردر المشتريات (بعدد المحلات)
export function calculateShoppingFee(
  numShops: number,
  pricingZone: PricingZone
): ShoppingPriceResult {
  const baseFee = pricingZone.base_fee_shopping ?? pricingZone.minimum_fee
  const perShop = pricingZone.price_per_shop ?? 5
  const shops = Math.max(1, Math.min(numShops, 4))  // 1 to 4

  const calculatedFee = baseFee + (shops - 1) * perShop
  const finalFee = Math.ceil(calculatedFee)

  return {
    numShops: shops,
    zone: pricingZone.zone,
    finalFee,
    breakdown: `${baseFee} جنيه أساسي + ${shops - 1} محل إضافي × ${perShop} جنيه = ${finalFee} جنيه`,
  }
}

export function detectZone(coords: Coordinates): string {
  if (coords.lat >= 29.9 && coords.lat <= 30.1 &&
      coords.lng >= 30.8 && coords.lng <= 31.1) {
    return 'الجيزة'
  }
  if (coords.lat >= 29.7 && coords.lat <= 30.3 &&
      coords.lng >= 31.0 && coords.lng <= 31.6) {
    return 'القاهرة'
  }
  return 'default'
}
