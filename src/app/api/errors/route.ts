export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimiter'

export async function POST(req: NextRequest) {
  // Rate limit: 10 per minute per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null
  if (ip && !rateLimit(`errors:${ip}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()
    const { endpoint, status, error, context } = await req.json()

    if (!endpoint || !error) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await prisma.frontendError.create({
      data: {
        userId: session?.user?.id || null,
        endpoint: String(endpoint).slice(0, 500),
        status: status ? Number(status) : null,
        error: String(error).slice(0, 2000),
        context: context ? String(context).slice(0, 1000) : null,
        userAgent: req.headers.get('user-agent')?.slice(0, 500) || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
