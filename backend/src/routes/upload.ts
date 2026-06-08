// =============================================================
// Upload API - رفع صور البطايق على R2
// POST /upload-id
// =============================================================

import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'
import { uploadImageToR2, validateImage, createSignedUrl, verifySignedToken } from '../lib/r2'

export const uploadRouter = new Hono<{ Bindings: Env }>()

// =====================
// POST /upload-id - رفع صور البطاقة (وجه وضهر)
// =====================
uploadRouter.post('/upload-id', authMiddleware, async (c) => {
  const user = c.get('user')
  const formData = await c.req.formData()

  const frontFile = formData.get('front') as File | null
  const backFile = formData.get('back') as File | null

  if (!frontFile || !backFile) {
    return c.json({ error: 'لازم ترفع صورة الوجه والضهر' }, 400)
  }

  // التحقق من صحة الصور
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
// POST /upload/product - رفع صورة منتج أو إعلان
// =====================
uploadRouter.post('/upload/product', authMiddleware, async (c) => {
  const user = c.get('user')
  const formData = await c.req.formData()
  const imageFile = formData.get('image') as File | null

  if (!imageFile) {
    return c.json({ error: 'لازم ترفع صورة' }, 400)
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
      url: `/api/media/view?key=${encodeURIComponent(result.key)}`
    })
  } catch (err) {
    return c.json({ error: 'مقدرناش نرفع الصورة' }, 500)
  }
})

// =====================
// GET /media/view?key=&token= - عرض صورة بـ Signed URL
// الـ link صالح 5 دقايق بس
// =====================
uploadRouter.get('/media/view', authMiddleware, async (c) => {
  const key = c.req.query('key')
  const token = c.req.query('token')

  if (!key || !token) {
    return c.json({ error: 'بيانات ناقصة' }, 400)
  }

  const verification = verifySignedToken(token, decodeURIComponent(key))
  if (!verification.valid) {
    return c.json({ error: verification.reason || 'لينك منتهي الصلاحية' }, 403)
  }

  try {
    const object = await c.env.MANDOUBAK_R2.get(decodeURIComponent(key))

    if (!object) {
      return c.json({ error: 'الصورة مش موجودة' }, 404)
    }

    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
    headers.set('Cache-Control', 'private, max-age=300')  // 5 دقايق
    headers.set('Content-Disposition', 'inline')

    return new Response(object.body, { headers })
  } catch (err) {
    return c.json({ error: 'مقدرناش نجيب الصورة' }, 500)
  }
})

// =====================
// GET /upload/signed-url/:key - إنشاء Signed URL جديد
// =====================
uploadRouter.get('/signed-url/:key', authMiddleware, async (c) => {
  const user = c.get('user')
  const key = c.req.param('key')
  
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
