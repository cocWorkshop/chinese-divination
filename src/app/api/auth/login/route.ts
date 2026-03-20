import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logAuth } from '@/lib/authLog'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null
  const userAgent = req.headers.get('user-agent') || null

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      await logAuth({ action: 'login', status: 'failure', email, reason: 'user_not_found', ip, userAgent })
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
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
