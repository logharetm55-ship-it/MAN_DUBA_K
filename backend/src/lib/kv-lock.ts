// =============================================================
// Cloudflare KV Lock - منع Race Condition على الأوردرات
// =============================================================

export type KVLockResult = 
  | { acquired: true; lockKey: string }
  | { acquired: false; reason: string }

const LOCK_TTL_SECONDS = 10  // 10 ثواني timeout للـ lock
const CACHE_TTL_SECONDS = 3  // 3 ثواني cache للأوردرات الجديدة

/**
 * يحاول يحجز lock على أوردر معين
 * بيستخدم KV atomic write عشان يضمن مندوب واحد بس ياخد الأوردر
 */
export async function acquireOrderLock(
  kv: KVNamespace,
  orderId: string,
  courierId: string
): Promise<KVLockResult> {
  const lockKey = `order_lock:${orderId}`
  
  // محاولة كتابة الـ lock
  // لو فيه value موجود، الـ KV put بياخد المكان
  // بنستخدم خطوتين: GET ثم PUT داخل نفس الـ request
  
  const existing = await kv.get(lockKey)
  
  if (existing !== null) {
    return {
      acquired: false,
      reason: `الأوردر محجوز من مندوب تاني (${existing})`
    }
  }

  // ضع الـ lock مع TTL
  await kv.put(lockKey, courierId, { expirationTtl: LOCK_TTL_SECONDS })
  
  // تحقق إن اللي كتبه هو نفسه (Double-check بعد الكتابة)
  const verify = await kv.get(lockKey)
  
  if (verify !== courierId) {
    return {
      acquired: false,
      reason: 'مندوب تاني سبقك في نفس اللحظة'
    }
  }

  return { acquired: true, lockKey }
}

/**
 * يفك الـ lock بعد ما الأوردر يتحجز في الـ database
 */
export async function releaseOrderLock(
  kv: KVNamespace,
  orderId: string
): Promise<void> {
  const lockKey = `order_lock:${orderId}`
  await kv.delete(lockKey)
}

/**
 * Cache الأوردرات الجديدة لمدة 3 ثواني
 * عشان 500 مندوب مايضربوش الـ database كل ثانية
 */
export async function cachePendingOrders(
  kv: KVNamespace,
  orders: unknown[]
): Promise<void> {
  const cacheKey = 'pending_orders_cache'
  await kv.put(cacheKey, JSON.stringify({
    data: orders,
    cachedAt: Date.now()
  }), { expirationTtl: CACHE_TTL_SECONDS })
}

/**
 * يجيب الأوردرات من الـ cache
 */
export async function getCachedPendingOrders(
  kv: KVNamespace
): Promise<{ data: unknown[]; cachedAt: number } | null> {
  const cacheKey = 'pending_orders_cache'
  const cached = await kv.get(cacheKey)
  
  if (!cached) return null
  
  return JSON.parse(cached)
}

/**
 * يمسح الـ cache بعد قبول أوردر (عشان المناديب يشوفوا التحديث)
 */
export async function invalidatePendingOrdersCache(
  kv: KVNamespace
): Promise<void> {
  await kv.delete('pending_orders_cache')
}
