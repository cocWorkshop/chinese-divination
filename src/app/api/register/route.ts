export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken, tokenExpiry, sendVerificationEmail } from '@/lib/email'
import { logAuth } from '@/lib/authLog'
import { CURRENT_POLICY_VERSION } from '@/lib/policyVersion'
import { rateLimit } from '@/lib/rateLimiter'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null
  const userAgent = req.headers.get('user-agent') || null

  // Rate limit: 3 attempts per hour per IP
  if (ip && !rateLimit(`register:${ip}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 })
  }

  try {
    const { name, email: rawEmail, password, referralCode, language } = await req.json()
    const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : rawEmail

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain uppercase, lowercase, and a number' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    if (existing) {
      await logAuth({ action: 'register', status: 'failure', email, reason: 'email_exists', ip, userAgent })
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashed = await hash(password, 12)

    // Read register bonus from admin settings
    const registerBonusSetting = await prisma.adminSetting.findUnique({ where: { key: 'registerBonus' } })
    const registerBonus = parseInt(registerBonusSetting?.value ?? '6', 10) || 6

    // Check referral code and get share bonus amounts
    let shareBonus = 0
    let shareLink: { id: string; userId: string; code: string; used: boolean } | null = null
    if (referralCode) {
      shareLink = await prisma.shareLink.findUnique({ where: { code: referralCode } })
      if (shareLink && !shareLink.used && shareLink.userId) {
        const shareBonusSetting = await prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } })
        shareBonus = parseInt(shareBonusSetting?.value ?? '3', 10) || 3
      }
    }

    const totalInitialCredits = registerBonus + shareBonus
    const vToken = generateToken()
    const user = await prisma.user.create({
      data: {
        email, password: hashed, name: name || null, language: language || 'zh-TW',
        credits: totalInitialCredits,
        emailVerified: false,
        verificationToken: vToken,
        tokenExpiry: tokenExpiry(24),
        consentAt: new Date(),
        consentVersion: CURRENT_POLICY_VERSION,
      },
    })

    // Send verification email (non-blocking — don't fail registration if email fails)
    try {
      const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || ''
      await sendVerificationEmail(email, vToken, language || 'zh-TW', origin)
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr)
    }

    // Grant bonus to sharer and mark link as used
    if (shareLink && !shareLink.used) {
      await prisma.$transaction(async (tx) => {
        // Conditional update — concurrent registrations with the same
        // referral code can't both flip `used` and double-credit the sharer.
        const won = await tx.shareLink.updateMany({
          where: { code: shareLink.code, used: false },
          data: { used: true, usedBy: user.id, usedAt: new Date() },
        })
        if (won.count === 0) return
        await tx.user.update({
          where: { id: shareLink.userId },
          data: {
            credits: { increment: shareBonus },
          },
        })
      })
    }

    await logAuth({ action: 'register', status: 'success', email, userId: user.id, ip, userAgent })

    return NextResponse.json({
      id: user.id, email: user.email,
      needsVerification: true,
      registerBonus,
      ...(shareBonus > 0 && { shareBonus }),
    }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
