export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
  const minRating = url.searchParams.get('minRating') ? parseInt(url.searchParams.get('minRating')!) : undefined
  const maxRating = url.searchParams.get('maxRating') ? parseInt(url.searchParams.get('maxRating')!) : undefined
  const sort = url.searchParams.get('sort') || 'newest' // newest | oldest | rating_high | rating_low

  const where: Record<string, unknown> = {}
  if (minRating !== undefined || maxRating !== undefined) {
    where.rating = {
      ...(minRating !== undefined && { gte: minRating }),
      ...(maxRating !== undefined && { lte: maxRating }),
    }
  }

  const orderBy = sort === 'oldest' ? { createdAt: 'asc' as const }
    : sort === 'rating_high' ? { rating: 'desc' as const }
    : sort === 'rating_low' ? { rating: 'asc' as const }
    : { createdAt: 'desc' as const }

  const [feedbacks, total] = await Promise.all([
    prisma.readingFeedback.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        reading: {
          select: { type: true, createdAt: true, question: true },
        },
      },
    }),
    prisma.readingFeedback.count({ where }),
  ])

  // Get user emails for display
  const userIds = Array.from(new Set(feedbacks.map(f => f.userId)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, { email: u.email, name: u.name }]))

  const result = feedbacks.map(f => ({
    id: f.id,
    rating: f.rating,
    feedback: f.feedback,
    createdAt: f.createdAt,
    user: userMap[f.userId] || { email: 'unknown', name: null },
    reading: f.reading,
  }))

  return NextResponse.json({ feedbacks: result, total, page, limit })
}
