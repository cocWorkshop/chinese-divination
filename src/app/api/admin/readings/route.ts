export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)
  const type = url.searchParams.get('type') || undefined
  const userId = url.searchParams.get('userId') || undefined
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { deletedAt: null }
  if (type) where.type = type
  if (userId) where.userId = userId

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        modelTier: true,
        question: true,
        inputData: true,
        language: true,
        targetType: true,
        rating: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        familyMember: { select: { name: true, relation: true } },
      },
    }),
    prisma.reading.count({ where }),
  ])

  return NextResponse.json({ readings, total, page, limit, pages: Math.ceil(total / limit) })
}
