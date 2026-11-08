export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { rateLimit } from '@/lib/rateLimiter'

const MAX_ACTIVE_LINKS = 10

function getBaseUrl(req?: NextRequest): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  const host = req?.headers.get('host')
  if (host) {
    const proto = req?.headers.get('x-forwarded-proto') || 'http'
    return `${proto}://${host}`
  }
  return 'http://localhost:8088'
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: '請先登入 / Please log in first',
      },
      { status: 401 }
    )
  }

  let forceNew = false
  try {
    const body = await req.json()
    if (body?.forceNew === true) {
      forceNew = true
    }
  } catch {
    // Body may be empty or not json, which is expected for default POST
  }

  const baseUrl = getBaseUrl(req)

  // 1. Unless forcing a fresh code, reuse the latest active unclaimed link if available
  if (!forceNew) {
    const existing = await prisma.shareLink.findFirst({
      where: { userId: session.user.id, used: false },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    })

    if (existing) {
      return NextResponse.json({
        code: existing.code,
        url: `${baseUrl}/share/${existing.code}`,
        reused: true,
      })
    }
  }

  // 2. Generating a new link: enforce creation rate limit (10 creations per minute)
  if (!rateLimit(`share-create:${session.user.id}`, 10, 60 * 1000)) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        message: '操作過於頻繁，請稍候再試 / Too many requests. Please try again later.',
      },
      { status: 429 }
    )
  }

  // 3. Keep active unclaimed links bounded. If at or above capacity, auto-prune oldest
  // unclaimed links to make room so the user is NEVER hard-blocked from sharing.
  const activeCount = await prisma.shareLink.count({
    where: { userId: session.user.id, used: false },
  })

  if (activeCount >= MAX_ACTIVE_LINKS) {
    const pruneCount = activeCount - MAX_ACTIVE_LINKS + 1
    const oldestLinks = await prisma.shareLink.findMany({
      where: { userId: session.user.id, used: false },
      orderBy: { createdAt: 'asc' },
      take: pruneCount,
      select: { id: true },
    })

    if (oldestLinks.length > 0) {
      await prisma.shareLink.deleteMany({
        where: { id: { in: oldestLinks.map((l) => l.id) } },
      })
    }
  }

  const code = crypto.randomBytes(8).toString('hex')

  await prisma.shareLink.create({
    data: {
      userId: session.user.id,
      code,
    },
  })

  return NextResponse.json({
    code,
    url: `${baseUrl}/share/${code}`,
    reused: false,
  })
}
