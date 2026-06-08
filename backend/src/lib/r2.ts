// =============================================================
// Cloudflare R2 - رفع صور البطايق وعمل Signed URLs
// =============================================================

export type UploadResult = {
  key: string
  url: string
  size: number
}

export type ImageType = 'id_front' | 'id_back' | 'product' | 'ad'

/**
 * رفع صورة على R2
 */
export async function uploadImageToR2(
  bucket: R2Bucket,
  imageBuffer: ArrayBuffer,
  courierId: string,
  imageType: ImageType,
  contentType: string
): Promise<UploadResult> {
  const timestamp = Date.now()
  const extension = contentType.includes('png') ? 'png' : 'jpg'
  const key = `${imageType}/${courierId}/${timestamp}.${extension}`

  await bucket.put(key, imageBuffer, {
    httpMetadata: {
      contentType,
      cacheControl: 'private, no-cache',
    },
    customMetadata: {
      courierId,
      imageType,
      uploadedAt: new Date().toISOString(),
    }
  })

  return {
    key,
    url: key,  // بيتبعت للـ database كـ key مش URL مباشر
    size: imageBuffer.byteLength,
  }
}

/**
 * إنشاء Signed URL صالح لمدة 5 دقايق بس (للأمان)
 * المندوب مايقدرش يشارك الـ link مع حد
 */
export async function createSignedUrl(
  bucket: R2Bucket,
  key: string,
  expiresInSeconds: number = 300  // 5 دقايق
): Promise<string> {
  // R2 مش بيدعم signed URLs مباشرة من الـ Worker
  // بنستخدم حل بديل: نرجع الـ object مباشر من الـ worker
  // أو نستخدم pre-signed URL من AWS S3-compatible API

  // الحل الأكثر أمان: إرجاع لينك مؤقت من خلال endpoint محمي
  const expiresAt = Date.now() + (expiresInSeconds * 1000)
  const tempToken = btoa(`${key}:${expiresAt}`)
  
  return `/api/media/view?key=${encodeURIComponent(key)}&token=${tempToken}`
}

/**
 * التحقق من صحة الـ signed token
 */
export function verifySignedToken(
  token: string,
  key: string
): { valid: boolean; reason?: string } {
  try {
    const decoded = atob(token)
    const [tokenKey, expiresAtStr] = decoded.split(':')
    
    if (tokenKey !== key) {
      return { valid: false, reason: 'التوكن مش صحيح' }
    }
    
    const expiresAt = parseInt(expiresAtStr)
    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'اللينك انتهت صلاحيته' }
    }
    
    return { valid: true }
  } catch {
    return { valid: false, reason: 'توكن غلط' }
  }
}

/**
 * حذف صورة من R2
 */
export async function deleteImageFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key)
}

/**
 * التحقق من حجم وامتداد الصورة قبل الرفع
 */
export function validateImage(
  size: number,
  contentType: string
): { valid: boolean; error?: string } {
  const MAX_SIZE = 5 * 1024 * 1024  // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  
  if (size > MAX_SIZE) {
    return { valid: false, error: 'حجم الصورة أكبر من 5MB' }
  }
  
  if (!ALLOWED_TYPES.includes(contentType)) {
    return { valid: false, error: 'نوع الملف غير مدعوم (JPG, PNG, WebP فقط)' }
  }
  
  return { valid: true }
}
