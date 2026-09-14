import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimiter'

const registerDeviceSchema = z.object({
  token: z.string().trim().min(10).max(512),
  platform: z.enum(['ios', 'android']),
})

const unregisterDeviceSchema = z.object({
  token: z.string().trim().min(10).max(512),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!rateLimit(`register-device:${session.user.id}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many device registration attempts' }, { status: 429 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = registerDeviceSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid device registration data' }, { status: 400 })
  }
  const { token, platform } = parsed.data

  // Upsert: if same user+token exists, just update; otherwise create
  await prisma.deviceToken.upsert({
    where: {
      userId_token: { userId: session.user.id, token },
    },
    update: { platform, active: true, updatedAt: new Date() },
    create: { userId: session.user.id, token, platform },
  })

  return NextResponse.json({ ok: true })
}

// Allow user to unregister (e.g. on logout)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = unregisterDeviceSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing or invalid token' }, { status: 400 })
  }
  const { token } = parsed.data

  await prisma.deviceToken.updateMany({
    where: { userId: session.user.id, token },
    data: { active: false },
  })

  return NextResponse.json({ ok: true })
}
