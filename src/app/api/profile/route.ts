export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hash, compare } from 'bcryptjs'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Boundary validation: previously a string birthLat or object name landed in
// the DB unchecked. Empty strings are normalized to null by the `|| null`
// mapping below, so '' stays accepted as "clear this field".
const profileUpdateSchema = z.object({
  name: z.string().max(100).nullish(),
  birthDate: z.string().max(20).nullish(),
  birthTime: z.string().max(20).nullish(),
  birthPlace: z.string().max(200).nullish(),
  gender: z.enum(['male', 'female']).or(z.literal('')).nullish(),
  language: z.string().max(10).nullish(),
  timeMode: z.enum(['fuzzy', 'precise']).or(z.literal('')).nullish(),
  calendarType: z.enum(['solar', 'lunar']).or(z.literal('')).nullish(),
  exactTime: z.string().max(10).nullish(),
  birthEnvironment: z.string().max(500).nullish(),
  birthLat: z.number().min(-90).max(90).nullish(),
  birthLng: z.number().min(-180).max(180).nullish(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().max(200).optional(),
})

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = profileUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) },
      { status: 400 }
    )
  }
  const { name, birthDate, birthTime, birthPlace, gender, language, timeMode, calendarType, exactTime, birthEnvironment, birthLat, birthLng, currentPassword, newPassword } = parsed.data

  const updateData: Record<string, string | number | null> = {
    name: name || null,
    birthDate: birthDate || null,
    birthTime: birthTime || null,
    birthPlace: birthPlace || null,
    gender: gender || null,
    language: language || 'zh',
    timeMode: timeMode || null,
    calendarType: calendarType || null,
    exactTime: exactTime ?? null,
    birthEnvironment: birthEnvironment ?? null,
    birthLat: birthLat ?? null,
    birthLng: birthLng ?? null,
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
      exactTime: true, birthEnvironment: true,
      birthLat: true, birthLng: true,
      role: true, isAdmin: true, password: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { password, ...rest } = user
  return NextResponse.json({ ...rest, hasPassword: Boolean(password) })
}
