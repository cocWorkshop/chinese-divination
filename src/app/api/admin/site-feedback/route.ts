export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
  const minRating = url.searchParams.get('minRating') ? parseInt(url.searchParams.get('minRating')!) : undefined
  const maxRating = url.searchParams.get('maxRating') ? parseInt(url.searchParams.get('maxRating')!) : undefined

  const where: Record<string, unknown> = {}
  if (minRating !== undefined || maxRating !== undefined) {
    where.rating = {
      ...(minRating !== undefined && { gte: minRating }),
      ...(maxRating !== undefined && { lte: maxRating }),
    }
  }

  const [feedbacks, total] = await Promise.all([
    prisma.siteFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.siteFeedback.count({ where }),
  ])

  const userIds = Array.from(new Set(feedbacks.map(f => f.userId)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, { email: u.email, name: u.name }]))

  return NextResponse.json({
    feedbacks: feedbacks.map(f => ({
      ...f,
      user: userMap[f.userId] || { email: 'unknown', name: null },
    })),
    total, page, limit,
  })
}
