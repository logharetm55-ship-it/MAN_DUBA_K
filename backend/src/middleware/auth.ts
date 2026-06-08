// =============================================================
// Auth Middleware - Clerk Token Verification
// =============================================================

import { createMiddleware } from 'hono/factory'
import { createClerkClient } from '@clerk/backend'
import type { Env } from '../index'

export type AuthUser = {
  userId: string
  clerkId: string
  role: 'CLIENT' | 'COURIER' | 'ADMIN'
  phone?: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
  }
}

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'مش مسجل دخول' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY })
    const payload = await clerk.verifyToken(token)
    
    // جيب role اليوزر من Supabase
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { data: user } = await supabase
      .from('users')
      .select('id, role, phone')
      .eq('clerk_id', payload.sub)
      .single()

    if (!user) {
      return c.json({ error: 'اليوزر مش موجود' }, 401)
    }

    c.set('user', {
      userId: user.id,
      clerkId: payload.sub,
      role: user.role,
      phone: user.phone,
    })

    await next()
  } catch (err) {
    return c.json({ error: 'التوكن مش صحيح' }, 401)
  }
})

export const requireRole = (...roles: AuthUser['role'][]) => 
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get('user')
    if (!roles.includes(user.role)) {
      return c.json({ error: 'مش عندك صلاحية' }, 403)
    }
    await next()
  })
