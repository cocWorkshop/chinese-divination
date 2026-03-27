export const dynamic = 'force-dynamic'
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
        divinationCredits: true, chatCredits: true, credits: true,
        usageDivination: true, usageChat: true, usageMaster: true,
        createdAt: true, language: true,
        _count: { select: { readings: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Get usage stats from LlmLog grouped by userId + endpoint
  const userIds = users.map(u => u.id)
  const usageStats = userIds.length > 0
    ? await prisma.llmLog.groupBy({
        by: ['userId', 'endpoint'],
        where: { userId: { in: userIds }, status: 'success' },
        _count: true,
      })
    : []

  // Build lookup: userId -> { divination, chat }
  const usageMap: Record<string, { divination: number; chat: number }> = {}
  for (const stat of usageStats) {
    if (!stat.userId) continue
    if (!usageMap[stat.userId]) usageMap[stat.userId] = { divination: 0, chat: 0 }
    if (stat.endpoint === 'divination') usageMap[stat.userId].divination += stat._count
    else if (stat.endpoint === 'chat' || stat.endpoint === 'chat-summary') usageMap[stat.userId].chat += stat._count
  }

  const usersWithStats = users.map(u => ({
    ...u,
    usageDivination: usageMap[u.id]?.divination ?? u._count.readings,
    usageChat: usageMap[u.id]?.chat ?? 0,
  }))

  return NextResponse.json({
    users: usersWithStats,
    total,
    pages: Math.ceil(total / limit),
    page,
  })
}
