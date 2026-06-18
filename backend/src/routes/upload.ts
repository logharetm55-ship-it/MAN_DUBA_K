// =============================================================
// Upload API - رفع الصور (R2 أو Local Filesystem كـ fallback)
// POST /api/upload/id      - رفع صور البطاقة
// POST /api/upload/product - رفع صورة منتج/إعلان (أدمن فقط)
// GET  /api/upload/local/:filename - عرض صورة محلية
// =============================================================

import { Hono } from 'hono'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { Env } from '../index'
import { authMiddleware } from '../middleware/auth'

export const uploadRouter = new Hono<{ Bindings: Env }>()

// Max file size: 5MB
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const LOCAL_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')

// =====================
// Middleware - Auth required
// =====================
uploadRouter.use('/id', authMiddleware)
uploadRouter.use('/product', authMiddleware)

// =====================
// Local file storage helper
// =====================
function ensureUploadDir() {
  if (!existsSync(LOCAL_UPLOAD_DIR)) {
    mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true })
  }
}

function saveLocally(buffer: ArrayBuffer, contentType: string, prefix: string): string {
  ensureUploadDir()
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const filename = `${prefix}_${Date.now()}.${ext}`
  const filepath = join(LOCAL_UPLOAD_DIR, filename)
  writeFileSync(filepath, Buffer.from(buffer))
  return `/api/upload/local/${filename}`
}

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
    return c.json({ error: 'لازم ترفع صورة الوجه (front) والضهر (back)' }, 400)
  }

  for (const [label, file] of [['وجه البطاقة', frontFile], ['ضهر البطاقة', backFile]] as [string, File][]) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ error: `${label}: JPG/PNG/WebP بس` }, 400)
    }
    if (file.size > MAX_SIZE_BYTES) {
      return c.json({ error: `${label}: الصورة أكبر من 5MB` }, 400)
    }
    if (file.size === 0) {
      return c.json({ error: `${label}: الملف فاضي` }, 400)
    }
  }

  try {
    const frontBuffer = await frontFile.arrayBuffer()
    const backBuffer = await backFile.arrayBuffer()

    let frontUrl: string
    let backUrl: string

    const r2 = (c.env as Record<string, unknown>)?.MANDOUBAK_R2 as R2Bucket | undefined

    if (r2) {
      // رفع على Cloudflare R2
      const frontKey = `id_front/${user.userId}/${Date.now()}.${frontFile.type.includes('png') ? 'png' : 'jpg'}`
      const backKey = `id_back/${user.userId}/${Date.now()}.${backFile.type.includes('png') ? 'png' : 'jpg'}`

      await Promise.all([
        r2.put(frontKey, frontBuffer, { httpMetadata: { contentType: frontFile.type } }),
        r2.put(backKey, backBuffer, { httpMetadata: { contentType: backFile.type } }),
      ])

      frontUrl = `/api/upload/view?key=${encodeURIComponent(frontKey)}`
      backUrl = `/api/upload/view?key=${encodeURIComponent(backKey)}`
    } else {
      // Fallback: حفظ محلي
      frontUrl = saveLocally(frontBuffer, frontFile.type, `front_${user.userId}`)
      backUrl = saveLocally(backBuffer, backFile.type, `back_${user.userId}`)
    }

    return c.json({
      success: true,
      message: 'تم رفع الصور بنجاح',
      keys: { front: frontUrl, back: backUrl },
    })
  } catch (err) {
    console.error('Upload ID error:', err)
    return c.json({ error: 'مقدرناش نرفع الصور، جرب تاني' }, 500)
  }
})

// =====================
// POST /api/upload/product - رفع صورة منتج أو إعلان (أدمن فقط)
// =====================
uploadRouter.post('/product', async (c) => {
  const user = c.get('user')

  if (user.role !== 'ADMIN') {
    return c.json({ error: 'مش عندك صلاحية — أدمن فقط' }, 403)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'بيانات FormData غير صحيحة' }, 400)
  }

  const imageFile = formData.get('image') as File | null

  if (!imageFile) {
    return c.json({ error: 'لازم ترفع صورة (image)' }, 400)
  }
  if (!ALLOWED_TYPES.includes(imageFile.type)) {
    return c.json({ error: 'نوع الملف غير مدعوم — JPG/PNG/WebP بس' }, 400)
  }
  if (imageFile.size > MAX_SIZE_BYTES) {
    return c.json({ error: 'الصورة أكبر من 5MB' }, 400)
  }

  try {
    const buffer = await imageFile.arrayBuffer()
    let url: string

    const r2 = (c.env as Record<string, unknown>)?.MANDOUBAK_R2 as R2Bucket | undefined

    if (r2) {
      const key = `product/${user.userId}/${Date.now()}.${imageFile.type.includes('png') ? 'png' : 'jpg'}`
      await r2.put(key, buffer, { httpMetadata: { contentType: imageFile.type } })
      url = `/api/upload/view?key=${encodeURIComponent(key)}`
    } else {
      url = saveLocally(buffer, imageFile.type, `ad_${user.userId}`)
    }

    return c.json({ success: true, url })
  } catch (err) {
    console.error('Product upload error:', err)
    return c.json({ error: 'مقدرناش نرفع الصورة' }, 500)
  }
})

// =====================
// GET /api/upload/local/:filename - عرض صور محفوظة محلياً
// =====================
uploadRouter.get('/local/:filename', async (c) => {
  const filename = c.req.param('filename')

  // Security: prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return c.json({ error: 'مسار غير صحيح' }, 400)
  }

  // Only allow image extensions
  if (!/\.(jpg|jpeg|png|webp)$/i.test(filename)) {
    return c.json({ error: 'نوع ملف غير مسموح' }, 400)
  }

  try {
    const filepath = join(LOCAL_UPLOAD_DIR, filename)
    if (!existsSync(filepath)) {
      return c.json({ error: 'الصورة مش موجودة' }, 404)
    }

    const data = readFileSync(filepath)
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('Local file error:', err)
    return c.json({ error: 'مقدرناش نجيب الصورة' }, 500)
  }
})

// =====================
// GET /api/upload/view?key= - عرض صورة من R2
// =====================
uploadRouter.get('/view', authMiddleware, async (c) => {
  const key = c.req.query('key')

  if (!key) {
    return c.json({ error: 'key مطلوب' }, 400)
  }

  const decodedKey = decodeURIComponent(key)
  if (decodedKey.includes('..') || decodedKey.startsWith('/')) {
    return c.json({ error: 'مسار غير صحيح' }, 400)
  }

  try {
    const r2 = (c.env as Record<string, unknown>)?.MANDOUBAK_R2 as R2Bucket | undefined
    if (!r2) return c.json({ error: 'R2 غير متاح' }, 501)

    const object = await r2.get(decodedKey)
    if (!object) return c.json({ error: 'الصورة مش موجودة' }, 404)

    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
    headers.set('Cache-Control', 'private, max-age=300')
    return new Response(object.body, { headers })
  } catch (err) {
    return c.json({ error: 'مقدرناش نجيب الصورة' }, 500)
  }
})
