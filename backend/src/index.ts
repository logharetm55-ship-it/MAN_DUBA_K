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

// =============================================================
// GET /api/setup - إنشاء الجداول المطلوبة تلقائياً (يُشغَّل مرة واحدة)
// =============================================================
app.get('/api/setup', async (c) => {
  const supabaseUrl = c.env.SUPABASE_URL
  const supabaseKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return c.json({ error: 'Supabase غير مهيأ' }, 500)
  }

  const results: Record<string, string> = {}

  // إنشاء جدول notifications
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS notifications (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type       TEXT NOT NULL DEFAULT 'system',
            title      TEXT NOT NULL,
            message    TEXT NOT NULL,
            icon       TEXT,
            is_read    BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);
          ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_all') THEN
              CREATE POLICY notif_all ON notifications FOR ALL USING (TRUE) WITH CHECK (TRUE);
            END IF;
          END $$;
        `,
      }),
    })
    results.notifications = res.ok ? '✅ تم إنشاء جدول notifications' : `⚠️ ${res.status}`
  } catch (e) {
    results.notifications = `❌ ${e}`
  }

  // إنشاء accept_order function
  try {
    const { getSupabaseClient } = await import('./lib/supabase')
    const supabase = getSupabaseClient(supabaseUrl, supabaseKey)
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE OR REPLACE FUNCTION accept_order(p_order_id UUID, p_courier_id UUID)
        RETURNS JSON LANGUAGE plpgsql AS $$
        DECLARE v_order RECORD;
        BEGIN
          SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
          IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'الأوردر مش موجود'); END IF;
          IF v_order.status != 'PENDING' THEN RETURN json_build_object('success', false, 'message', 'الأوردر اتحجز'); END IF;
          UPDATE orders SET courier_id=p_courier_id, status='ACCEPTED', accepted_at=NOW(), updated_at=NOW() WHERE id=p_order_id;
          RETURN json_build_object('success', true, 'message', 'تم قبول الأوردر');
        END; $$;
      `,
    })
    results.accept_order_fn = error ? `⚠️ ${error.code}` : '✅ accept_order function جاهزة'
  } catch (e) {
    results.accept_order_fn = `❌ ${e}`
  }

  return c.json({ success: true, results, note: 'شغّل sql/full-setup.sql في Supabase SQL Editor للإعداد الكامل' })
})

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
