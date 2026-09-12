export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, tokenExpiry, sendVerificationEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimiter'

// Uniform response for every branch — differential messages here would let
// anonymous callers enumerate which emails are registered / verified.
const GENERIC_MESSAGE = 'If the account exists and is not yet verified, a verification email has been sent.'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || null

    // Rate limit: 3 per hour per IP — each resend to a real address fires
    // an actual email (bombing vector) and a verificationToken DB write.
    if (ip && !rateLimit(`resend-verification:${ip}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email: rawEmail } = await req.json()
    const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : rawEmail
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, emailVerified: true, language: true },
    })

    if (!user || user.emailVerified) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    const vToken = generateToken()
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: vToken, tokenExpiry: tokenExpiry(24) },
    })

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || ''
    await sendVerificationEmail(email, vToken, user.language || 'zh-TW', origin)

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (e) {
    console.error('Resend verification error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
