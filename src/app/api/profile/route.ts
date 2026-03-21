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

  const { name, birthDate, birthTime, birthPlace, gender, language, currentPassword, newPassword } = await req.json()

  const updateData: Record<string, string | null> = {
    name: name || null,
    birthDate: birthDate || null,
    birthTime: birthTime || null,
    birthPlace: birthPlace || null,
    gender: gender || null,
    language: language || 'zh',
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
      role: true, isAdmin: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}
