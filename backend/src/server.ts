// =============================================================
// Local Dev Server - Node.js adapter للـ Hono app
// بيشتغل محلياً بدل Cloudflare Workers
// =============================================================

import { serve } from '@hono/node-server'
import app from './index'

// Mock Cloudflare bindings for local development
const mockEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  NODE_ENV: process.env.NODE_ENV || 'development',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  // KV mock (in-memory)
  MANDOUBAK_KV: createKVMock(),
  // R2 mock
  MANDOUBAK_R2: createR2Mock(),
}

function createKVMock(): KVNamespace {
  const store = new Map<string, { value: string; expiresAt?: number }>()
  
  return {
    get: async (key: string) => {
      const item = store.get(key)
      if (!item) return null
      if (item.expiresAt && Date.now() > item.expiresAt) {
        store.delete(key)
        return null
      }
      return item.value
    },
    put: async (key: string, value: string, options?: { expirationTtl?: number }) => {
      store.set(key, {
        value,
        expiresAt: options?.expirationTtl 
          ? Date.now() + options.expirationTtl * 1000 
          : undefined,
      })
    },
    delete: async (key: string) => { store.delete(key) },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async (key: string) => {
      const value = await (mockEnv.MANDOUBAK_KV as KVNamespace).get(key)
      return { value, metadata: null, cacheStatus: null }
    },
  } as unknown as KVNamespace
}

function createR2Mock(): R2Bucket {
  const store = new Map<string, { body: ArrayBuffer; httpMetadata?: Record<string, string> }>()
  
  return {
    put: async (key: string, body: ArrayBuffer, options?: unknown) => {
      store.set(key, { body, httpMetadata: (options as { httpMetadata?: Record<string, string> })?.httpMetadata })
      return { key, version: '1', size: body.byteLength, etag: 'mock' } as R2Object
    },
    get: async (key: string) => {
      const item = store.get(key)
      if (!item) return null
      return {
        key,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(item.body))
            controller.close()
          }
        }),
        httpMetadata: item.httpMetadata,
        arrayBuffer: async () => item.body,
        text: async () => '',
      } as unknown as R2ObjectBody
    },
    delete: async (key: string) => { store.delete(key) },
    list: async () => ({ objects: [], truncated: false, cursor: undefined, delimitedPrefixes: [] }),
    head: async (key: string) => store.has(key) ? { key } as R2Object : null,
    createMultipartUpload: async () => { throw new Error('Not implemented') },
    resumeMultipartUpload: () => { throw new Error('Not implemented') },
  } as unknown as R2Bucket
}

const PORT = parseInt(process.env.PORT || '8787')

serve({
  fetch: (req) => {
    const binding = { env: mockEnv }
    return (app as unknown as { fetch: (req: Request, env: unknown) => Response }).fetch(req, mockEnv)
  },
  port: PORT,
}, (info) => {
  console.log(`\n🚀 مندوبك API يشتغل على: http://localhost:${info.port}`)
  console.log('📦 Endpoints:')
  console.log('  GET  /api/pricing/calculate')
  console.log('  POST /api/orders')
  console.log('  GET  /api/orders/pending')
  console.log('  POST /api/orders/:id/accept')
  console.log('  POST /api/couriers/register')
  console.log('  POST /api/upload-id')
  console.log('  GET  /api/admin/dashboard')
})
