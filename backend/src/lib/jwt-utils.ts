// =============================================================
// JWT + Password Utils - Web Crypto API (Node.js 20 + Cloudflare Workers)
// =============================================================

// =====================
// Password Hashing (PBKDF2)
// =====================

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const toHex = (buf: Uint8Array) =>
    Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${toHex(salt)}:${toHex(new Uint8Array(bits))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltHex, storedHash] = stored.split(':')
    if (!saltHex || !storedHash) return false
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      256
    )
    const hashHex = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex === storedHash
  } catch {
    return false
  }
}

// =====================
// JWT (HS256 with Web Crypto)
// =====================

function b64url(obj: object): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeB64url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') +
    '=='.slice(0, (4 - str.length % 4) % 4)
  return atob(padded)
}

export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSecs = 86400 * 30  // 30 days
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSecs }

  const headerB64 = b64url({ alg: 'HS256', typ: 'JWT' })
  const payloadB64 = b64url(fullPayload)
  const signing = `${headerB64}.${payloadB64}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBytes = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(signing)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${signing}.${sigB64}`
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, sigB64] = parts
    const signing = `${headerB64}.${payloadB64}`

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const sigBytes = Uint8Array.from(
      decodeB64url(sigB64),
      c => c.charCodeAt(0)
    )
    const valid = await crypto.subtle.verify(
      'HMAC', key, sigBytes, new TextEncoder().encode(signing)
    )
    if (!valid) return null

    const payload = JSON.parse(decodeB64url(payloadB64))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}
