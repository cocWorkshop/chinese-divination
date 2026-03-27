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
        createdAt: true, language: true,
        _count: { select: { readings: true } },
        masterSession: { select: { totalCreditsUsed: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Count chat rounds per user (readings with non-empty chatMessages)
  const userIds = users.map(u => u.id)
  const chatCounts = userIds.length > 0
    ? await prisma.reading.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, chatMessages: { not: null } },
        _count: true,
      })
    : []
  const chatCountMap = Object.fromEntries(chatCounts.map(c => [c.userId, c._count]))

  const enrichedUsers = users.map(u => ({
    ...u,
    chatRounds: chatCountMap[u.id] || 0,
    masterRounds: u.masterSession?.totalCreditsUsed || 0,
    masterSession: undefined,
  }))

  return NextResponse.json({
    users: enrichedUsers,
    total,
    pages: Math.ceil(total / limit),
    page,
  })
}
