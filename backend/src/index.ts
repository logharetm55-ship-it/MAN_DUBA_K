// =============================================================
// مندوبك - Cloudflare Workers + Hono Main Entry
// =============================================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
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
}

const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: ['https://mandoubak.com', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Health check
app.get('/', (c) => c.json({ 
  status: 'ok', 
  app: 'مندوبك API', 
  version: '1.0.0',
  timestamp: new Date().toISOString()
}))

// Public routes
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

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: 'خطأ في السيرفر', details: err.message }, 500)
})

export default app
