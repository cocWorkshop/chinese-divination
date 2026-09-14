export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Boundary validation for create/update. Field shapes only — the
// relation==='other' ⇒ relationDetail cross-field rule stays in
// validateRelationDetail() below.
const memberFieldsSchema = z.object({
  relation: z.string().min(1).max(50),
  relationDetail: z.string().max(100).nullish(),
  name: z.string().max(100).nullish(),
  birthDate: z.string().max(20).nullish(),
  birthTime: z.string().max(20).nullish(),
  birthPlace: z.string().max(200).nullish(),
  gender: z.enum(['male', 'female']).or(z.literal('')).nullish(),
  calendarType: z.enum(['solar', 'lunar']).or(z.literal('')).nullish(),
  timeMode: z.enum(['fuzzy', 'precise']).or(z.literal('')).nullish(),
  exactTime: z.string().max(10).nullish(),
  birthLat: z.number().min(-90).max(90).nullish(),
  birthLng: z.number().min(-180).max(180).nullish(),
  birthEnvironment: z.string().max(500).nullish(),
})

const deleteMemberSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

function invalidInput(error: z.ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Invalid input', issues: error.issues.map(i => `${i.path.join('.')}: ${i.message}`) },
    { status: 400 }
  )
}

/**
 * Validate relationDetail cross-field rule: required when relation === 'other'.
 * Applies to create + update. Returns an error Response on failure, null on OK.
 */
function validateRelationDetail(relation: unknown, relationDetail: unknown): NextResponse | null {
  if (relation === 'other') {
    const rd = typeof relationDetail === 'string' ? relationDetail.trim() : ''
    if (!rd) {
      return NextResponse.json(
        {
          error:
            "relationDetail is required when relation is 'other' (please describe the specific relationship, e.g. '岳父' / 'business partner').",
        },
        { status: 400 },
      )
    }
  }
  return null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const members = await prisma.familyMember.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = memberFieldsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return invalidInput(parsed.error)
  const {
    relation, relationDetail, name, birthDate, birthTime, birthPlace, gender,
    calendarType, timeMode, exactTime, birthLat, birthLng, birthEnvironment,
  } = parsed.data
  const detailErr = validateRelationDetail(relation, relationDetail)
  if (detailErr) return detailErr

  const member = await prisma.familyMember.create({
    data: {
      userId: session.user.id,
      relation,
      relationDetail: relationDetail?.trim() || null,
      name,
      birthDate,
      birthTime,
      birthPlace,
      gender,
      calendarType,
      timeMode,
      exactTime,
      birthLat: birthLat ?? null,
      birthLng: birthLng ?? null,
      birthEnvironment,
    },
  })

  return NextResponse.json({ member })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = memberFieldsSchema.extend({ id: z.string().min(1) }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return invalidInput(parsed.error)
  const {
    id, relation, relationDetail, name, birthDate, birthTime, birthPlace, gender,
    calendarType, timeMode, exactTime, birthLat, birthLng, birthEnvironment,
  } = parsed.data
  const detailErr = validateRelationDetail(relation, relationDetail)
  if (detailErr) return detailErr

  // Verify ownership
  const existing = await prisma.familyMember.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const member = await prisma.familyMember.update({
    where: { id },
    data: {
      relation,
      relationDetail: typeof relationDetail === 'string' ? relationDetail.trim() || null : null,
      name,
      birthDate,
      birthTime,
      birthPlace,
      gender,
      calendarType,
      timeMode,
      exactTime,
      birthLat: birthLat ?? null,
      birthLng: birthLng ?? null,
      birthEnvironment,
    },
  })

  return NextResponse.json({ member })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = deleteMemberSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ID is required' },
      { status: 400 }
    )
  }
  const { id } = parsed.data

  const existing = await prisma.familyMember.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.familyMember.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
