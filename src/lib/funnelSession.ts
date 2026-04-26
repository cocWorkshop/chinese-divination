/**
 * Funnel session — signed cookie carrying a tentative user's id while they
 * walk through the /start ad funnel. Tentative users have no NextAuth
 * session (no password yet), so this cookie is the only way the funnel API
 * routes can identify them.
 *
 * Cookie value: `<userId>.<expiresAtMs>.<hmacBase64Url>`
 * Signed with HMAC-SHA256 over `<userId>.<expiresAtMs>` using NEXTAUTH_SECRET.
 *
 * Lifetime: 24h. The funnel is short — most users complete or bounce within
 * minutes — but 24h gives stragglers a window to come back and finish.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export const FUNNEL_COOKIE_NAME = 'xj_funnel_session'
export const FUNNEL_COOKIE_MAX_AGE_SEC = 24 * 60 * 60

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET is not set')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export interface FunnelToken {
  value: string
  expires: Date
}

/** Produce a signed cookie value bound to a user id. */
export function signFunnelToken(userId: string): FunnelToken {
  const expiresAt = Date.now() + FUNNEL_COOKIE_MAX_AGE_SEC * 1000
  const payload = `${userId}.${expiresAt}`
  const signature = sign(payload)
  return { value: `${payload}.${signature}`, expires: new Date(expiresAt) }
}

/**
 * Verify a cookie value. Returns the userId on success, null on any failure
 * (malformed, expired, bad signature). Constant-time comparison.
 */
export function verifyFunnelToken(value: string | undefined | null): { userId: string } | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [userId, expiresAtStr, signature] = parts
  if (!userId || !expiresAtStr || !signature) return null
  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null
  const expected = sign(`${userId}.${expiresAtStr}`)
  try {
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return { userId }
}
