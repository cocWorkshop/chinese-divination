export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

import { rateLimit } from '@/lib/rateLimiter'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ISS-08 / S2: Limit link creation to prevent abuse (10 creations per minute)
  if (!rateLimit(`share-create:${session.user.id}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // Cap active unclaimed links per user
  const activeCount = await prisma.shareLink.count({
    where: { userId: session.user.id, used: false },
  })
  if (activeCount >= 10) {
    return NextResponse.json(
      { error: 'Too many active share links. Please share your existing links first.' },
      { status: 429 }
    )
  }

  const code = crypto.randomBytes(8).toString('hex')
  
  await prisma.shareLink.create({
    data: {
      userId: session.user.id,
      code,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8094'
  return NextResponse.json({ code, url: `${baseUrl}/share/${code}` })
}
