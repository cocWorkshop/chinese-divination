export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logAuth } from '@/lib/authLog'
import { rateLimit } from '@/lib/rateLimiter'
import { dummyBcryptCompare } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null
  const userAgent = req.headers.get('user-agent') || null

  // Rate limit: 5 attempts per minute per IP
  if (ip && !rateLimit(`login:${ip}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 })
  }

  try {
    const { email: rawEmail, password } = await req.json()
    const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : rawEmail

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })

    if (!user) {
      await dummyBcryptCompare(password) // timing equalizer (see lib/auth.ts)
      await logAuth({ action: 'login', status: 'failure', email, reason: 'user_not_found', ip, userAgent })
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    // Tentative users have no password (created via the /start funnel).
    // Surface a specific error code so the UI can redirect them to finish
    // their pending signup at /start/unlock instead of silently failing.
    if (!user.password) {
      await dummyBcryptCompare(password) // timing equalizer
      await logAuth({ action: 'login', status: 'failure', email, userId: user.id, reason: 'tentative_user', ip, userAgent })
      return NextResponse.json({ error: 'TENTATIVE_USER', tentative: true }, { status: 403 })
    }

    const isValid = await compare(password, user.password)
    if (!isValid) {
      await logAuth({ action: 'login', status: 'failure', email, userId: user.id, reason: 'invalid_password', ip, userAgent })
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    if (!user.emailVerified) {
      await logAuth({ action: 'login', status: 'failure', email, userId: user.id, reason: 'email_not_verified', ip, userAgent })
      return NextResponse.json({ error: 'EMAIL_NOT_VERIFIED', unverified: true }, { status: 403 })
    }

    // Success — log it, then let the client call signIn() to establish the session
    await logAuth({ action: 'login', status: 'success', email, userId: user.id, ip, userAgent })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
