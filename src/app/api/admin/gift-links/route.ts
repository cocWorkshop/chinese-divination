export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// GET: list gift links
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')

  const [links, total] = await Promise.all([
    prisma.giftLink.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { claims: true } } },
    }),
    prisma.giftLink.count(),
  ])

  return NextResponse.json({ links, total, page, pages: Math.ceil(total / limit) })
}

// POST: create gift link
export async function POST(req: NextRequest) {
  const { error, user } = await requireAdmin()
  if (error) return error

  const { credits, maxClaims, note, expiresInHours } = await req.json()

  if (!credits || credits < 1) {
    return NextResponse.json({ error: '机缘数量必须大于0' }, { status: 400 })
  }

  const code = randomBytes(6).toString('base64url') // 8 chars, URL-safe
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : null

  const link = await prisma.giftLink.create({
    data: {
      code,
      credits: parseInt(credits),
      maxClaims: parseInt(maxClaims) || 1,
      note: note || null,
      expiresAt,
      createdBy: user!.id,
    },
  })

  return NextResponse.json({ success: true, link, url: `/gift/${code}` })
}
