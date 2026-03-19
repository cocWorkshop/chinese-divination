import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, referralCode } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
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

    const user = await prisma.user.create({
      data: {
        email, password: hashed, name: name || null,
        bonusModel1: bonus1,
        bonusModel2: bonus2,
      },
    })

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

    return NextResponse.json({
      id: user.id, email: user.email,
      ...(bonus1 > 0 && { bonusModel1: bonus1 }),
      ...(bonus2 > 0 && { bonusModel2: bonus2 }),
    }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
