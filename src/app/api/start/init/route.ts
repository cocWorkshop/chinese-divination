/**
 * POST /api/start/init — funnel View 2 → View 3 hand-off.
 *
 * Accepts birth info + email from the funnel cast form. Creates (or reuses)
 * a tentative user, grants a small trial Karma allotment on first contact,
 * provisions a pending bazi Reading row, and sets the funnel session cookie.
 *
 * Tentative users have no password and no NextAuth session. The funnel
 * cookie is the only auth credential they carry through Views 3-5; it
 * expires in 24h. /start/unlock converts them to full users by setting a
 * password (and `tentative=false`).
 *
 * Behavior on duplicate email:
 *   - if the existing user is fully-registered → 409 ALREADY_REGISTERED
 *     (the frontend redirects to /login; their proper account stays intact)
 *   - if the existing user is tentative → reuse it; do NOT re-grant trial
 *     Karma (trialCreditsGranted gates this). They can still create a fresh
 *     Reading, but only if they have credits left from the original grant.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimiter'
import {
  FUNNEL_COOKIE_NAME,
  FUNNEL_COOKIE_MAX_AGE_SEC,
  signFunnelToken,
} from '@/lib/funnelSession'

/** Default trial Karma allotment per email if no AdminSetting override.
 * Sized to cover one bazi reading (5 Karma) plus ~5 master demo turns
 * (1 Karma each). The AdminSetting key `trialCredits` overrides this at
 * runtime so admins can tune the funnel cost without redeploying. */
const DEFAULT_TRIAL_CREDITS = 10

async function resolveTrialCredits(): Promise<number> {
  const setting = await prisma.adminSetting.findUnique({ where: { key: 'trialCredits' } })
  if (!setting) return DEFAULT_TRIAL_CREDITS
  const n = parseInt(setting.value, 10)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TRIAL_CREDITS
}

const SHICHEN_VALID = new Set([
  'zi_early', 'chou', 'yin', 'mao', 'chen', 'si',
  'wu', 'wei', 'shen', 'you', 'xu', 'hai', 'zi_late',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null

  // 10 attempts per hour per IP — generous since this is the ad funnel
  // entry point but bounds bot abuse on email enumeration.
  if (ip && !rateLimit(`startInit:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    )
  }

  let body: {
    email?: unknown
    birthDate?: unknown
    birthTime?: unknown
    gender?: unknown
    utm?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate : ''
  const birthTime = typeof body.birthTime === 'string' ? body.birthTime : ''
  const gender = body.gender === 'male' || body.gender === 'female' ? body.gender : null

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return NextResponse.json({ error: 'Invalid birth date' }, { status: 400 })
  }
  if (!SHICHEN_VALID.has(birthTime)) {
    return NextResponse.json({ error: 'Invalid birth time' }, { status: 400 })
  }
  if (!gender) {
    return NextResponse.json({ error: 'Invalid gender' }, { status: 400 })
  }

  // Sanitize utm dict — only keep string-valued entries.
  const utmRaw = body.utm && typeof body.utm === 'object' ? body.utm as Record<string, unknown> : null
  const utm: Record<string, string> = {}
  if (utmRaw) {
    for (const [k, v] of Object.entries(utmRaw)) {
      if (typeof v === 'string' && v.length <= 200) utm[k] = v
    }
  }
  const funnelSource = {
    ...utm,
    enteredAt: new Date().toISOString(),
    ...(ip ? { ip } : {}),
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })

  let userId: string
  let isReturning = false

  if (existing) {
    if (!existing.tentative) {
      // Real account — funnel is wrong door for them.
      return NextResponse.json(
        {
          error: 'ALREADY_REGISTERED',
          message: 'Email already registered, please log in instead.',
        },
        { status: 409 },
      )
    }
    // Resume the tentative row. No new credit grant — trialCreditsGranted
    // already true from the first /start/init by this email.
    userId = existing.id
    isReturning = true
  } else {
    const trialCredits = await resolveTrialCredits()
    const created = await prisma.user.create({
      data: {
        email,
        password: null,
        tentative: true,
        emailVerified: false,
        credits: trialCredits,
        trialCreditsGranted: true,
        funnelSource,
        language: 'zh-TW',
      },
      select: { id: true },
    })
    userId = created.id
  }

  // Provision a pending bazi Reading. View 3 will trigger the actual
  // streaming divination via the existing /api/divination route — that
  // route accepts the funnel cookie auth (added separately).
  //
  // birthPlace defaults to "中国" because we deliberately don't ask for it
  // on the funnel form (low friction). Trial accuracy is acceptable; users
  // can re-cast with precise birthplace after registering.
  const reading = await prisma.reading.create({
    data: {
      userId,
      type: 'bazi',
      modelTier: 'model1',
      status: 'pending',
      result: '',
      inputData: {
        birthDate,
        birthTime,
        gender,
        timeMode: 'fuzzy',
        birthPlace: '中国',
      },
      language: 'zh-TW',
      targetType: 'self',
    },
    select: { id: true },
  })

  const token = signFunnelToken(userId)
  const res = NextResponse.json(
    {
      readingId: reading.id,
      isReturning,
    },
    { status: 201 },
  )
  res.cookies.set(FUNNEL_COOKIE_NAME, token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: FUNNEL_COOKIE_MAX_AGE_SEC,
    expires: token.expires,
  })
  return res
}
