// =============================================================
// Clerk Webhook - مزامنة اليوزرية مع Supabase
// بيستقبل أحداث user.created و user.updated من Clerk
// Svix signature verification مبنية manually بـ Node crypto
// =============================================================

import { Hono } from 'hono'
import { createHmac, timingSafeEqual } from 'crypto'
import type { Env } from '../index'

type WebhookEvent =
  | { type: 'user.created'; data: ClerkUserData }
  | { type: 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: { id: string } }

interface ClerkUserData {
  id: string
  first_name: string | null
  last_name: string | null
  email_addresses: Array<{ email_address: string; id: string }>
  phone_numbers: Array<{ phone_number: string; id: string }>
  image_url: string
  primary_email_address_id: string | null
  primary_phone_number_id: string | null
}

export const webhookRouter = new Hono<{ Bindings: Env }>()

// Svix webhook signature verification
// Spec: https://docs.svix.com/receiving/verifying-payloads/how-manual
function verifySvixSignature(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): boolean {
  try {
    // Check timestamp (reject if >5 min old)
    const ts = parseInt(svixTimestamp)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - ts) > 300) {
      console.error('Webhook timestamp too old:', ts)
      return false
    }

    // Strip "whsec_" prefix if present
    const cleanSecret = secret.startsWith('whsec_')
      ? secret.slice('whsec_'.length)
      : secret

    // Build signed content: `id.timestamp.body`
    const signedContent = `${svixId}.${svixTimestamp}.${body}`

    // HMAC-SHA256 with base64-decoded secret
    const secretBytes = Buffer.from(cleanSecret, 'base64')
    const expectedSig = createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64')

    // Svix sends multiple signatures: "v1,sig1 v1,sig2"
    const signatures = svixSignature.split(' ')
    for (const sigEntry of signatures) {
      const parts = sigEntry.split(',')
      if (parts.length < 2) continue
      const version = parts[0]
      const sig = parts.slice(1).join(',')

      if (version !== 'v1') continue

      try {
        const expectedBuf = Buffer.from(expectedSig, 'base64')
        const actualBuf = Buffer.from(sig, 'base64')
        if (expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf)) {
          return true
        }
      } catch {
        continue
      }
    }

    return false
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

webhookRouter.post('/clerk', async (c) => {
  const webhookSecret = c.env.CLERK_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET غير موجود')
    return c.json({ error: 'Webhook secret not configured' }, 500)
  }

  const svixId = c.req.header('svix-id')
  const svixTimestamp = c.req.header('svix-timestamp')
  const svixSignature = c.req.header('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing svix headers' }, 400)
  }

  const body = await c.req.text()

  // تحقق من الـ signature
  const isValid = verifySvixSignature(body, svixId, svixTimestamp, svixSignature, webhookSecret)
  if (!isValid) {
    console.error('Invalid webhook signature')
    return c.json({ error: 'Invalid signature' }, 400)
  }

  let event: WebhookEvent
  try {
    event = JSON.parse(body) as WebhookEvent
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    if (event.type === 'user.created') {
      await handleUserCreated(supabase, event.data)
    } else if (event.type === 'user.updated') {
      await handleUserUpdated(supabase, event.data)
    } else if (event.type === 'user.deleted') {
      await handleUserDeleted(supabase, event.data.id)
    }

    return c.json({ success: true, type: event.type })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return c.json({ error: 'Handler error' }, 500)
  }
})

type SupabaseClient = ReturnType<typeof import('@supabase/supabase-js').createClient>

async function handleUserCreated(supabase: SupabaseClient, data: ClerkUserData) {
  const primaryEmail = data.email_addresses.find(e => e.id === data.primary_email_address_id)
  const primaryPhone = data.phone_numbers.find(p => p.id === data.primary_phone_number_id)
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'مستخدم جديد'

  const { error } = await supabase
    .from('users')
    .insert({
      clerk_id: data.id,
      name,
      email: primaryEmail?.email_address || null,
      phone: primaryPhone?.phone_number || null,
      avatar_url: data.image_url || null,
      role: 'CLIENT',
      created_at: new Date().toISOString(),
    })

  if (error) {
    if (error.code === '23505') {
      console.log('User already exists:', data.id)
      return
    }
    console.error('Error creating user:', error)
    throw error
  }

  console.log('✅ User synced to Supabase:', data.id, name)
}

async function handleUserUpdated(supabase: SupabaseClient, data: ClerkUserData) {
  const primaryEmail = data.email_addresses.find(e => e.id === data.primary_email_address_id)
  const primaryPhone = data.phone_numbers.find(p => p.id === data.primary_phone_number_id)
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined

  const { error } = await supabase
    .from('users')
    .update({
      ...(name && { name }),
      email: primaryEmail?.email_address || null,
      phone: primaryPhone?.phone_number || null,
      avatar_url: data.image_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', data.id)

  if (error) {
    console.error('Error updating user:', error)
    throw error
  }

  console.log('✅ User updated in Supabase:', data.id)
}

async function handleUserDeleted(supabase: SupabaseClient, clerkId: string) {
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('clerk_id', clerkId)

  if (error) {
    console.error('Error soft-deleting user:', error)
    throw error
  }

  console.log('✅ User soft-deleted:', clerkId)
}
