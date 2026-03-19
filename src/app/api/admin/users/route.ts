import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const search = searchParams.get('search') || ''

  const where = search
    ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, name: true, isAdmin: true, isPaid: true, role: true,
        hourlyQuota: true, bonusModel1: true, bonusModel2: true,
        createdAt: true, language: true,
        _count: { select: { readings: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Get today's usage for each user (both model tiers)
  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const rateLimits = await prisma.rateLimit.findMany({
    where: { userId: { in: users.map(u => u.id) }, windowStart },
    select: { userId: true, count: true, modelTier: true },
  })

  const usageMap: Record<string, { model1: number; model2: number }> = {}
  for (const r of rateLimits) {
    if (!usageMap[r.userId]) usageMap[r.userId] = { model1: 0, model2: 0 }
    if (r.modelTier === 'model2') usageMap[r.userId].model2 = r.count
    else usageMap[r.userId].model1 = r.count
  }

  return NextResponse.json({
    users: users.map(u => ({
      ...u,
      usedTodayModel1: usageMap[u.id]?.model1 ?? 0,
      usedTodayModel2: usageMap[u.id]?.model2 ?? 0,
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
  })
}
