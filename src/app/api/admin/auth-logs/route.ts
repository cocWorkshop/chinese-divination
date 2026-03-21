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
  const status = searchParams.get('status') || 'all' // all | success | failure
  const action = searchParams.get('action') || 'all' // all | login | logout | register
  const from = searchParams.get('from') || null
  const to = searchParams.get('to') || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (status !== 'all') where.status = status
  if (action !== 'all') where.action = action
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z')
  }

  const [logs, total] = await Promise.all([
    prisma.authLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.authLog.count({ where }),
  ])

  // Stats
  const [totalSuccess, totalFailure, totalToday] = await Promise.all([
    prisma.authLog.count({ where: { ...where, status: 'success' } }),
    prisma.authLog.count({ where: { ...where, status: 'failure' } }),
    prisma.authLog.count({
      where: {
        createdAt: { gte: new Date(new Date().toISOString().split('T')[0]) },
      },
    }),
  ])

  return NextResponse.json({
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: { totalSuccess, totalFailure, totalToday },
  })
}
