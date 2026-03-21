export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Always return success (don't reveal if email exists)
    const successMsg = { message: 'If an account with that email exists, a reset link has been sent.' }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, language: true },
    })

    if (!user) return NextResponse.json(successMsg)

    const token = generateToken()
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || ''

    try {
      await sendPasswordResetEmail(email, token, user.language || 'zh-TW', origin)
    } catch (emailErr) {
      console.error('Reset email failed:', emailErr)
    }

    return NextResponse.json(successMsg)
  } catch (e) {
    console.error('Forgot password error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
