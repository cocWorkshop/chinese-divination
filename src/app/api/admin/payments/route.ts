export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))
  const search = (searchParams.get('search') || '').trim()

  const where = search
    ? {
        OR: [
          { stripeSessionId: { contains: search, mode: 'insensitive' as const } },
          { packId: { contains: search, mode: 'insensitive' as const } },
          { user: { email: { contains: search, mode: 'insensitive' as const } } },
          { user: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  const [payments, total, revenueAggregate, totalPaidUsers] = await Promise.all([
    prisma.paymentRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isPaid: true,
            paidAt: true,
          },
        },
      },
    }),
    prisma.paymentRecord.count({ where }),
    prisma.paymentRecord.aggregate({
      _sum: { amount: true },
      where: { status: 'completed' },
    }),
    prisma.user.count({
      where: { isPaid: true },
    }),
  ])

  return NextResponse.json({
    payments,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
    stats: {
      totalRevenue: revenueAggregate._sum.amount ?? 0,
      totalOrders: total,
      totalPaidUsers,
    },
  })
}
