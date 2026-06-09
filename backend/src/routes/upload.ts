// =============================================================
// Upload API - رفع صور البطايق على R2
// POST /api/upload/id      - رفع صور البطاقة
// POST /api/upload/product - رفع صورة منتج
// GET  /api/upload/view    - عرض صورة بـ Signed URL
// GET  /api/upload/signed  - إنشاء Signed URL
// =============================================================

import { Hono } from 'hono'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'
import { uploadImageToR2, validateImage, createSignedUrl, verifySignedToken } from '../lib/r2'

export const uploadRouter = new Hono<{ Bindings: Env }>()

// All upload routes require auth
uploadRouter.use('*', authMiddleware)

// Max file size: 5MB
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// =====================
// POST /api/upload/id - رفع صور البطاقة (وجه وضهر)
// =====================
uploadRouter.post('/id', async (c) => {
  const user = c.get('user')
  
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'بيانات FormData غير صحيحة' }, 400)
  }

  const frontFile = formData.get('front') as File | null
  const backFile = formData.get('back') as File | null

  if (!frontFile || !backFile) {
    return c.json({ error: 'لازم ترفع صورة الوجه والضهر' }, 400)
  }

  // Validate file types
  for (const [label, file] of [['وجه البطاقة', frontFile], ['ضهر البطاقة', backFile]] as [string, File][]) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: `${label}: نوع الملف غير مدعوم - JPG/PNG/WebP بس` }, 400)
    }
    if (file.size > MAX_SIZE_BYTES) {
      return c.json({ error: `${label}: الصورة أكبر من 5MB` }, 400)
    }
    if (file.size === 0) {
      return c.json({ error: `${label}: الملف فاضي` }, 400)
    }
  }

  const frontValidation = validateImage(frontFile.size, frontFile.type)
  if (!frontValidation.valid) {
    return c.json({ error: `صورة الوجه: ${frontValidation.error}` }, 400)
  }

  const backValidation = validateImage(backFile.size, backFile.type)
  if (!backValidation.valid) {
    return c.json({ error: `صورة الضهر: ${backValidation.error}` }, 400)
  }

  try {
    const frontBuffer = await frontFile.arrayBuffer()
    const backBuffer = await backFile.arrayBuffer()

    // رفع الصورتين بالتوازي
    const [frontResult, backResult] = await Promise.all([
      uploadImageToR2(
        c.env.MANDOUBAK_R2,
        frontBuffer,
        user.userId,
        'id_front',
        frontFile.type
      ),
      uploadImageToR2(
        c.env.MANDOUBAK_R2,
        backBuffer,
        user.userId,
        'id_back',
        backFile.type
      )
    ])

    return c.json({
      success: true,
      message: 'تم رفع الصور بنجاح',
      keys: {
        front: frontResult.key,
        back: backResult.key,
      }
    })

  } catch (err) {
    console.error('Upload error:', err)
    return c.json({ error: 'مقدرناش نرفع الصور، جرب تاني' }, 500)
  }
})

// =====================
// POST /api/upload/product - رفع صورة منتج أو إعلان
// =====================
uploadRouter.post('/product', async (c) => {
  const user = c.get('user')
  
  // Only admins can upload product images
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'مش عندك صلاحية' }, 403)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'بيانات FormData غير صحيحة' }, 400)
  }

  const imageFile = formData.get('image') as File | null

  if (!imageFile) {
    return c.json({ error: 'لازم ترفع صورة' }, 400)
  }

  if (!ALLOWED_TYPES.includes(imageFile.type)) {
    return c.json({ error: 'نوع الملف غير مدعوم - JPG/PNG/WebP بس' }, 400)
  }

  if (imageFile.size > MAX_SIZE_BYTES) {
    return c.json({ error: 'الصورة أكبر من 5MB' }, 400)
  }

  const validation = validateImage(imageFile.size, imageFile.type)
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400)
  }

  try {
    const buffer = await imageFile.arrayBuffer()
    const result = await uploadImageToR2(
      c.env.MANDOUBAK_R2,
      buffer,
      user.userId,
      'product',
      imageFile.type
    )

    return c.json({
      success: true,
      key: result.key,
      url: `/api/upload/view?key=${encodeURIComponent(result.key)}`
    })
  } catch (err) {
    console.error('Product upload error:', err)
    return c.json({ error: 'مقدرناش نرفع الصورة' }, 500)
  }
})

// =====================
// GET /api/upload/view?key=&token= - عرض صورة بـ Signed URL
// الـ link صالح 5 دقايق بس
// =====================
uploadRouter.get('/view', async (c) => {
  const user = c.get('user')
  const key = c.req.query('key')
  const token = c.req.query('token')

  if (!key || !token) {
    return c.json({ error: 'بيانات ناقصة' }, 400)
  }

  // Prevent path traversal
  const decodedKey = decodeURIComponent(key)
  if (decodedKey.includes('..') || decodedKey.startsWith('/')) {
    return c.json({ error: 'مسار غير صحيح' }, 400)
  }

  // Verify the user owns this file (unless admin)
  if (user.role !== 'ADMIN' && !decodedKey.includes(user.userId)) {
    return c.json({ error: 'مش عندك صلاحية لهذه الصورة' }, 403)
  }

  const verification = verifySignedToken(token, decodedKey)
  if (!verification.valid) {
    return c.json({ error: verification.reason || 'لينك منتهي الصلاحية' }, 403)
  }

  try {
    const object = await c.env.MANDOUBAK_R2.get(decodedKey)

    if (!object) {
      return c.json({ error: 'الصورة مش موجودة' }, 404)
    }

    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
    headers.set('Cache-Control', 'private, max-age=300, no-store')
    headers.set('Content-Disposition', 'inline')
    headers.set('X-Content-Type-Options', 'nosniff')

    return new Response(object.body, { headers })
  } catch (err) {
    return c.json({ error: 'مقدرناش نجيب الصورة' }, 500)
  }
})

// =====================
// GET /api/upload/signed/:key - إنشاء Signed URL جديد
// =====================
uploadRouter.get('/signed/:key', async (c) => {
  const user = c.get('user')
  const key = decodeURIComponent(c.req.param('key'))

  // Prevent path traversal
  if (key.includes('..') || key.startsWith('/')) {
    return c.json({ error: 'مسار غير صحيح' }, 400)
  }

  // التحقق إن الصورة ملك اليوزر أو الأدمن
  if (!key.includes(user.userId) && user.role !== 'ADMIN') {
    return c.json({ error: 'مش عندك صلاحية' }, 403)
  }

  const signedUrl = await createSignedUrl(c.env.MANDOUBAK_R2, key, 300)

  return c.json({
    success: true,
    url: signedUrl,
    expiresIn: 300,
    expiresAt: new Date(Date.now() + 300 * 1000).toISOString()
  })
})
