export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateToken, tokenExpiry, sendDeleteConfirmationEmail } from '@/lib/email'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  // Tentative users (no password set) shouldn't reach this route — they
  // have no NextAuth session — but guard defensively.
  if (!user.password) return NextResponse.json({ error: 'Account is tentative' }, { status: 400 })

  const isValid = await compare(password, user.password)
  if (!isValid) return NextResponse.json({ error: 'Invalid password' }, { status: 403 })

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
