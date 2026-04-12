export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const body = await req.json()
  const {
    relation, relationDetail, name, birthDate, birthTime, birthPlace, gender,
    calendarType, timeMode, exactTime, birthLat, birthLng, birthEnvironment,
  } = body
  if (!relation) {
    return NextResponse.json({ error: 'Relation is required' }, { status: 400 })
  }
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

  const body = await req.json()
  const {
    id, relation, relationDetail, name, birthDate, birthTime, birthPlace, gender,
    calendarType, timeMode, exactTime, birthLat, birthLng, birthEnvironment,
  } = body
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }
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

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const existing = await prisma.familyMember.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.familyMember.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
