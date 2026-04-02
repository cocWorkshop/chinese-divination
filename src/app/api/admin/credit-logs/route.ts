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
  const action = searchParams.get('action') || 'all'
  const userId = searchParams.get('userId') || null
  const from = searchParams.get('from') || null
  const to = searchParams.get('to') || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (action !== 'all') where.action = action
  if (userId) where.userId = userId
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z')
  }

  const [logs, total] = await Promise.all([
    prisma.creditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.creditLog.count({ where }),
  ])

  // Enrich with user email
  const userIds = [...new Set(logs.map(l => l.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  const enriched = logs.map(l => ({
    ...l,
    user: userMap[l.userId] || null,
  }))

  // Summary stats
  const [totalDeductions, totalGrants, todayCount] = await Promise.all([
    prisma.creditLog.aggregate({ where: { ...where, action: 'deduct' }, _sum: { amount: true } }),
    prisma.creditLog.aggregate({ where: { ...where, action: { startsWith: 'grant' } }, _sum: { amount: true } }),
    prisma.creditLog.count({
      where: { createdAt: { gte: new Date(new Date().toISOString().split('T')[0]) } },
    }),
  ])

  return NextResponse.json({
    logs: enriched,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: {
      totalDeducted: totalDeductions._sum.amount || 0,
      totalGranted: totalGrants._sum.amount || 0,
      todayCount,
    },
  })
}
