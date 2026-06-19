// =============================================================
// مندوبك - Hono Main Entry
// =============================================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { ordersRouter } from './routes/orders'
import { couriersRouter } from './routes/couriers'
import { adminRouter } from './routes/admin'
import { pricingRouter } from './routes/pricing'
import { uploadRouter } from './routes/upload'
import { usersRouter } from './routes/users'
import { authRouter } from './routes/auth'
import { notificationsRouter } from './routes/notifications'
import { authMiddleware } from './middleware/auth'

export type Env = {
  MANDOUBAK_KV: KVNamespace
  MANDOUBAK_R2: R2Bucket
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  CLERK_SECRET_KEY: string
  CLERK_WEBHOOK_SECRET: string
  JWT_SECRET: string
  NODE_ENV: string
  ALLOWED_ORIGINS?: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))
app.use('*', logger())
app.use('*', prettyJSON())

app.use('*', cors({
  origin: (origin, c) => {
    const configuredOrigins = c.env.ALLOWED_ORIGINS
      ? c.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : []
    const defaultOrigins = [
      'https://mandoubak.com',
      'https://www.mandoubak.com',
      'http://localhost:5000',
      'http://localhost:3000',
    ]
    const allowedOrigins = [...defaultOrigins, ...configuredOrigins]
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.replit\.app$/.test(origin) ||
      /^https:\/\/[a-z0-9-]+-\d+\.repl\.co$/.test(origin) ||
      (c.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'))
    ) {
      return origin
    }
    return null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
}))

app.get('/', (c) => c.json({
  status: 'ok',
  app: 'مندوبك API',
  version: '2.0.0',
  timestamp: new Date().toISOString(),
}))

// Public routes - no auth required
app.route('/api/auth', authRouter)
app.route('/api/pricing', pricingRouter)
app.route('/api/upload', uploadRouter)

// Protected routes
app.use('/api/orders/*', authMiddleware)
app.use('/api/couriers/*', authMiddleware)
app.use('/api/admin/*', authMiddleware)
app.use('/api/users/*', authMiddleware)

app.route('/api/orders', ordersRouter)
app.route('/api/couriers', couriersRouter)
app.route('/api/admin', adminRouter)
app.route('/api/users', usersRouter)
app.route('/api/notifications', notificationsRouter)

// Security alerts (public write, admin read handled inside adminRouter)
app.post('/api/security/alert', async (c) => {
  try {
    const body = await c.req.json()
    const supabaseUrl = c.env.SUPABASE_URL
    const supabaseKey = c.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return c.json({ ok: true })

    const { getSupabaseClient } = await import('./lib/supabase')
    const supabase = getSupabaseClient(supabaseUrl, supabaseKey)
    await supabase.from('security_alerts').insert({
      type: 'failed_admin_login',
      ip_address: c.req.header('x-forwarded-for') || 'unknown',
      user_agent: c.req.header('user-agent') || 'unknown',
      details: body,
    })
  } catch { /* silent */ }
  return c.json({ ok: true })
})

app.notFound((c) => c.json({ error: 'المسار مش موجود' }, 404))
app.onError((err, c) => {
  const isDev = c.env?.NODE_ENV === 'development'
  console.error('Server error:', err)
  return c.json({
    error: 'خطأ في السيرفر',
    ...(isDev && { details: err.message }),
  }, 500)
})

export default app
