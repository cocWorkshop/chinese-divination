/**
 * POST /api/start/complete — funnel View 5: convert tentative user → real user.
 *
 * The tentative user was created at /api/start/init with email but no
 * password. This endpoint reads the funnel session cookie to identify
 * them, validates the password, hashes + stores it, sets `tentative=false`
 * and `signupCompletedAt`, grants the signup Karma bonus (same key that
 * /api/register reads — registerBonus AdminSetting, default 6).
 *
 * Email verification: NOT auto-verified. Same as /api/register, this
 * endpoint generates a verification token and sends a verification email.
 * The user must click the link before they can log in. Funnel cookie is
 * cleared so they have to come back through the front door (login) — this
 * prevents an attacker who used someone else's email from continuing to
 * use the account via the funnel cookie alone.
 *
 * After success, the frontend redirects to /start/verify-sent which shows
 * a "check your email" splash with a resend button (uses the existing
 * /api/resend-verification endpoint).
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logAuth } from '@/lib/authLog'
import { CURRENT_POLICY_VERSION } from '@/lib/policyVersion'
import { rateLimit } from '@/lib/rateLimiter'
import { FUNNEL_COOKIE_NAME, verifyFunnelToken } from '@/lib/funnelSession'
import { generateToken, tokenExpiry, sendVerificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null
  const userAgent = req.headers.get('user-agent') || null

  if (ip && !rateLimit(`startComplete:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    )
  }

  // Resolve the tentative user from the funnel cookie. No NextAuth session
  // yet — that's set up only after this endpoint succeeds and the client
  // calls signIn().
  const cookieValue = req.cookies.get(FUNNEL_COOKIE_NAME)?.value
  const verified = verifyFunnelToken(cookieValue)
  if (!verified) {
    return NextResponse.json(
      { error: 'Funnel session expired or missing. Please start over.' },
      { status: 401 },
    )
  }

  let body: { password?: unknown; name?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : null

  // Same password policy as /api/register so signup vectors stay consistent.
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain uppercase, lowercase, and a number' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: verified.userId } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }
  if (!user.tentative) {
    // Already converted — race or replay. Treat as success but don't grant
    // a second bonus.
    return NextResponse.json({ success: true, alreadyCompleted: true, email: user.email })
  }

  // Look up the registerBonus admin setting (same as /api/register).
  const bonusSetting = await prisma.adminSetting.findUnique({ where: { key: 'registerBonus' } })
  const registerBonus = parseInt(bonusSetting?.value ?? '6', 10) || 6

  const hashed = await hash(password, 12)
  const vToken = generateToken()

  // Conditional update — `tentative: true` in the WHERE makes the
  // conversion single-shot: two concurrent submissions can't both pass the
  // check above and grant the register bonus twice.
  const converted = await prisma.user.updateMany({
    where: { id: user.id, tentative: true },
    data: {
      password: hashed,
      tentative: false,
      signupCompletedAt: new Date(),
      // Top up credits with the full registration bonus on top of any
      // remaining trial credits. The trial allotment was a marketing cost;
      // the post-signup bonus is the actual welcome gift.
      credits: { increment: registerBonus },
      // Email verification flow — same as /api/register. The user must
      // click the link in their inbox before they can log in.
      emailVerified: false,
      verificationToken: vToken,
      tokenExpiry: tokenExpiry(24),
      consentAt: new Date(),
      consentVersion: CURRENT_POLICY_VERSION,
      ...(name ? { name } : {}),
    },
  })

  if (converted.count === 0) {
    // Lost the conversion race — another concurrent request just converted
    // this user. Treat as success but this request grants nothing.
    return NextResponse.json({ success: true, alreadyCompleted: true, email: user.email })
  }

  // Send verification email — non-blocking. If it fails, the user can use
  // /api/resend-verification from the verify-sent splash to retry.
  try {
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || ''
    await sendVerificationEmail(user.email, vToken, user.language || 'zh-TW', origin)
  } catch (emailErr) {
    console.error('[start/complete] verification email send failed:', emailErr)
  }

  await logAuth({
    action: 'register',
    status: 'success',
    email: user.email,
    userId: user.id,
    reason: 'funnel_complete',
    ip,
    userAgent,
  })

  // Clear the funnel cookie. The user must verify their email and log in
  // via the front door before they can access the dashboard. This prevents
  // a fake-email attacker from continuing to use the account via the
  // funnel cookie alone.
  const res = NextResponse.json({
    success: true,
    email: user.email,
    registerBonus,
    needsEmailVerification: true,
  })
  res.cookies.set(FUNNEL_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
