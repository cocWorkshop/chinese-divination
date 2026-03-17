import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    totalReadings,
    readingsToday,
    readingsThisWeek,
    readingsByType,
    recentUsers,
    activeUsersHour,
    settings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.reading.count(),
    prisma.reading.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.reading.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.reading.groupBy({ by: ['type'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, name: true, createdAt: true, isAdmin: true },
    }),
    prisma.rateLimit.groupBy({
      by: ['userId'],
      where: { windowStart: { gte: hourAgo } },
      _sum: { count: true },
      having: { count: { _sum: { gt: 0 } } },
    }),
    prisma.adminSetting.findMany(),
  ])

  return NextResponse.json({
    totalUsers,
    totalReadings,
    readingsToday,
    readingsThisWeek,
    readingsByType: readingsByType.map(r => ({ type: r.type, count: r._count.id })),
    recentUsers,
    activeUsersLastHour: activeUsersHour.length,
    settings: Object.fromEntries(settings.map(s => [s.key, s.value])),
  })
}
