import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken, tokenExpiry, sendVerificationEmail } from '@/lib/email'
import { logAuth } from '@/lib/authLog'
import { CURRENT_POLICY_VERSION } from '@/lib/policyVersion'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null
  const userAgent = req.headers.get('user-agent') || null

  try {
    const { name, email, password, referralCode } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain uppercase, lowercase, and a number' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      await logAuth({ action: 'register', status: 'failure', email, reason: 'email_exists', ip, userAgent })
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashed = await hash(password, 12)

    // Check referral code and get bonus amounts
    let bonus1 = 0, bonus2 = 0
    let shareLink: { id: string; userId: string; code: string; used: boolean } | null = null
    if (referralCode) {
      shareLink = await prisma.shareLink.findUnique({ where: { code: referralCode } })
      if (shareLink && !shareLink.used && shareLink.userId) {
        const [s1, s2] = await Promise.all([
          prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } }),
          prisma.adminSetting.findUnique({ where: { key: 'shareBonusModel2' } }),
        ])
        bonus1 = parseInt(s1?.value ?? '20')
        bonus2 = parseInt(s2?.value ?? '0')
      }
    }

    const vToken = generateToken()
    const user = await prisma.user.create({
      data: {
        email, password: hashed, name: name || null,
        bonusModel1: bonus1,
        bonusModel2: bonus2,
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
      await sendVerificationEmail(email, vToken, 'zh-TW', origin)
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr)
    }

    // Grant bonus to sharer and mark link as used
    if (shareLink && !shareLink.used) {
      await prisma.$transaction([
        prisma.shareLink.update({
          where: { code: shareLink.code },
          data: { used: true, usedBy: user.id, usedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: shareLink.userId },
          data: {
            bonusModel1: { increment: bonus1 },
            ...(bonus2 > 0 && { bonusModel2: { increment: bonus2 } }),
          },
        }),
      ])
    }

    await logAuth({ action: 'register', status: 'success', email, userId: user.id, ip, userAgent })

    return NextResponse.json({
      id: user.id, email: user.email,
      needsVerification: true,
      ...(bonus1 > 0 && { bonusModel1: bonus1 }),
      ...(bonus2 > 0 && { bonusModel2: bonus2 }),
    }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
