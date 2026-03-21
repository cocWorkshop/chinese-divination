export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')
  const filter = searchParams.get('filter') || 'all'

  const where = filter !== 'all' ? { endpoint: filter } : {}

  const [logs, total] = await Promise.all([
    prisma.llmLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.llmLog.count({ where }),
  ])

  // Fetch user emails
  const userIds = Array.from(new Set(logs.map(l => l.userId).filter((id): id is string => !!id)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, { email: u.email, name: u.name }]))

  // Aggregate stats (for filtered set)
  const stats = await prisma.llmLog.aggregate({
    where,
    _sum: { totalTokens: true },
    _avg: { latencyMs: true },
    _count: true,
  })
  const errorCount = await prisma.llmLog.count({ where: { ...where, status: 'error' } })

  return NextResponse.json({
    logs: logs.map(l => ({ ...l, user: l.userId ? userMap[l.userId] || null : null })),
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: {
      totalCalls: stats._count,
      totalTokens: stats._sum.totalTokens || 0,
      avgLatencyMs: Math.round(stats._avg.latencyMs || 0),
      errorCount,
    },
  })
}
