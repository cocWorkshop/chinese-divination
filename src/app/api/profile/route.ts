export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hash, compare } from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, birthDate, birthTime, birthPlace, gender, language, timeMode, calendarType, currentPassword, newPassword } = await req.json()

  const updateData: Record<string, string | null> = {
    name: name || null,
    birthDate: birthDate || null,
    birthTime: birthTime || null,
    birthPlace: birthPlace || null,
    gender: gender || null,
    language: language || 'zh',
    timeMode: timeMode || null,
    calendarType: calendarType || null,
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: 'Password must contain uppercase, lowercase, and a number' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    // Tentative users have no current password — they shouldn't reach this
    // route (no NextAuth session) but guard defensively.
    if (!user.password) return NextResponse.json({ error: 'Account is tentative — complete signup first' }, { status: 400 })
    const valid = await compare(currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })
    updateData.password = await hash(newPassword, 12)
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true, birthDate: true, birthTime: true,
      birthPlace: true, gender: true, language: true,
      timeMode: true, calendarType: true,
      role: true, isAdmin: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}
