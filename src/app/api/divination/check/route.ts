export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Check if existing bazi/ziwei readings exist for given birth data + target
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, targetType, familyMemberId, inputData } = await req.json()

  // Only check cache for birth-profile based types
  if (type !== 'bazi' && type !== 'ziwei') {
    return NextResponse.json({ hasExisting: false })
  }

  if (!inputData?.birthDate || !inputData?.birthTime || !inputData?.gender) {
    return NextResponse.json({ hasExisting: false })
  }

  // Build query
  const where: Record<string, unknown> = {
    userId: session.user.id,
    type,
    targetType: targetType || 'self',
    deletedAt: null,
  }

  if (targetType === 'family' && familyMemberId) {
    where.familyMemberId = familyMemberId
  } else if (targetType === 'self') {
    where.familyMemberId = null
  }

  // Find all undeleted readings of this type for this target
  const readings = await prisma.reading.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Filter by matching birth data
  const matching = readings.filter((r) => {
    const input = r.inputData as Record<string, unknown>
    return (
      input.birthDate === inputData.birthDate &&
      input.birthTime === inputData.birthTime &&
      input.gender === inputData.gender &&
      (input.birthPlace || '') === (inputData.birthPlace || '')
    )
  })

  if (matching.length === 0) {
    return NextResponse.json({ hasExisting: false })
  }

  const latest = matching[0]
  return NextResponse.json({
    hasExisting: true,
    count: matching.length,
    latest: {
      id: latest.id,
      result: latest.result,
      createdAt: latest.createdAt,
      modelTier: latest.modelTier,
      question: latest.question,
    },
  })
}
