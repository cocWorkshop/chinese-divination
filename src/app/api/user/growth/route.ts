export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGrowth } from '@/lib/growth/growthSystem'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        usageDivination: true,
        usageMaster: true,
        usageChat: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Query completed readings by type to determine divination diversity & reconciliation
    const readingsGroup = await prisma.reading.groupBy({
      by: ['type'],
      where: {
        userId: session.user.id,
        status: 'completed',
        deletedAt: null,
      },
      _count: { id: true },
    })

    const typeCounts: Record<string, number> = {}
    let completedReadingsCount = 0
    for (const g of readingsGroup) {
      typeCounts[g.type] = g._count.id
      completedReadingsCount += g._count.id
    }

    const growthProfile = calculateGrowth({
      usageDivination: Math.max(user.usageDivination || 0, completedReadingsCount),
      usageMaster: user.usageMaster || 0,
      usageChat: user.usageChat || 0,
      typeCounts,
      completedReadingsCount,
      memberSince: user.createdAt,
    })

    return NextResponse.json(growthProfile)
  } catch (error) {
    console.error('Error fetching user growth profile:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
