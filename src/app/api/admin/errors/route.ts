export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100)

  const [errors, total] = await Promise.all([
    prisma.frontendError.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.frontendError.count(),
  ])

  // Join user info
  const userIds = Array.from(new Set(errors.map(e => e.userId).filter((id): id is string => !!id)))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, { email: u.email, name: u.name }]))

  return NextResponse.json({
    errors: errors.map(e => ({
      ...e,
      user: e.userId ? userMap[e.userId] || null : null,
    })),
    total,
    page,
    limit,
  })
}
