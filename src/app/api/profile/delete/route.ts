import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAuth } from '@/lib/authLog'

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const isValid = await compare(password, user.password)
  if (!isValid) return NextResponse.json({ error: 'Invalid password' }, { status: 403 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent') || null

  // Delete auth logs for this email
  await prisma.authLog.deleteMany({ where: { email: user.email } })

  // Delete user (cascades to readings, familyMembers, rateLimits, shareLinks, etc.)
  await prisma.user.delete({ where: { id: session.user.id } })

  // Log the deletion (won't have userId since user is gone)
  await logAuth({ action: 'logout', status: 'success', email: user.email, reason: 'account_deleted', ip, userAgent })

  return NextResponse.json({ ok: true })
}
