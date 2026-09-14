export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateToken, tokenExpiry, sendDeleteConfirmationEmail } from '@/lib/email'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { password } = body || {}

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  // Tentative users (mid-funnel) shouldn't reach this route — guard defensively.
  if (user.tentative) return NextResponse.json({ error: 'Account is tentative' }, { status: 400 })

  // Credentials accounts must verify current password; OAuth-only accounts
  // (password === null) verify identity via email confirmation token.
  if (user.password) {
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })
    const isValid = await compare(password, user.password)
    if (!isValid) return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
  }

  const deleteToken = generateToken()
  const deleteTokenExpiry = tokenExpiry(24)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { deleteToken, deleteTokenExpiry },
  })

  const origin = req.headers.get('origin') || undefined

  try {
    await sendDeleteConfirmationEmail(user.email, deleteToken, user.language || 'zh-TW', origin)
  } catch (err) {
    console.error('Failed to send delete confirmation email:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Confirmation email sent' })
}
