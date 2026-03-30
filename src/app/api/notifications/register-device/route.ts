import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token, platform } = await req.json()
  if (!token || !platform) {
    return NextResponse.json({ error: 'Missing token or platform' }, { status: 400 })
  }
  if (!['ios', 'android'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

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

  const { token } = await req.json()
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  await prisma.deviceToken.updateMany({
    where: { userId: session.user.id, token },
    data: { active: false },
  })

  return NextResponse.json({ ok: true })
}
