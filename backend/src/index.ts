// =============================================================
// مندوبك - Cloudflare Workers + Hono Main Entry
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
  ALLOWED_ORIGINS?: string  // comma-separated list of allowed origins
}

const app = new Hono<{ Bindings: Env }>()

// Security headers
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))

// Logger
app.use('*', logger())
app.use('*', prettyJSON())

// CORS - dynamic, supports production + Replit dev domains
app.use('*', cors({
  origin: (origin, c) => {
    // Allow configured origins (comma-separated env var)
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

    // Allow Replit preview domains (*.replit.app, *.repl.co)
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.replit\.app$/.test(origin) ||
      /^https:\/\/[a-z0-9-]+-\d+\.repl\.co$/.test(origin) ||
      (c.env.NODE_ENV === 'development' && origin.startsWith('http://localhost'))
    ) {
      return origin
    }

    return null  // Block unknown origins
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,  // 24 hours preflight cache
}))

// Rate limiting helper using KV
async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSecs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const count = parseInt(await kv.get(`rl:${key}`) || '0')
  if (count >= limit) return { allowed: false, remaining: 0 }
  await kv.put(`rl:${key}`, String(count + 1), { expirationTtl: windowSecs })
  return { allowed: true, remaining: limit - count - 1 }
}

// Health check
app.get('/', (c) => c.json({ 
  status: 'ok', 
  app: 'مندوبك API', 
  version: '1.0.0',
  timestamp: new Date().toISOString()
}))

// Public routes (rate limited)
app.route('/api/pricing', pricingRouter)
app.route('/api/upload', uploadRouter)

// Protected routes
app.use('/api/orders/*', authMiddleware)
app.use('/api/couriers/*', authMiddleware)
app.use('/api/admin/*', authMiddleware)

app.route('/api/orders', ordersRouter)
app.route('/api/couriers', couriersRouter)
app.route('/api/admin', adminRouter)

// 404 handler
app.notFound((c) => c.json({ error: 'المسار مش موجود' }, 404))

// Error handler - never leak internal errors
app.onError((err, c) => {
  const isDev = c.env?.NODE_ENV === 'development'
  console.error('Server error:', err)
  return c.json({
    error: 'خطأ في السيرفر',
    ...(isDev && { details: err.message }),
  }, 500)
})

export { checkRateLimit }
export default app
