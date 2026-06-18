// =============================================================
// Auth Middleware - Custom JWT (بدون Clerk)
// =============================================================

import { createMiddleware } from 'hono/factory'
import { verifyJWT } from '../lib/jwt-utils'
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
    const secret = c.env.JWT_SECRET || 'mandoubak-jwt-secret-2024'
    const payload = await verifyJWT(token, secret)

    if (!payload) {
      return c.json({ error: 'التوكن منتهي أو غلط — سجّل دخول تاني' }, 401)
    }

    const userId = String(payload.userId || '')
    const role = String(payload.role || 'CLIENT') as AuthUser['role']
    const phone = String(payload.phone || '')

    if (!userId) {
      return c.json({ error: 'بيانات التوكن غير مكتملة' }, 401)
    }

    c.set('user', {
      userId,
      clerkId: userId,
      role,
      phone,
    })

    await next()
  } catch (err) {
    return c.json({ error: 'خطأ في التحقق من الهوية' }, 401)
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
