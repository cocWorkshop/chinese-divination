import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, tokenExpiry, sendVerificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email, check } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, language: true },
    })

    // Login page check mode: just report if unverified
    if (check) {
      return NextResponse.json({ unverified: user ? !user.emailVerified : false })
    }

    if (!user) {
      return NextResponse.json({ message: 'If the account exists, a verification email has been sent.' })
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email already verified.' })
    }

    const vToken = generateToken()
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: vToken, tokenExpiry: tokenExpiry(24) },
    })

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || ''
    await sendVerificationEmail(email, vToken, user.language || 'zh-TW', origin)

    return NextResponse.json({ message: 'Verification email sent.' })
  } catch (e) {
    console.error('Resend verification error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
