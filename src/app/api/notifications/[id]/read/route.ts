export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.notificationRead.upsert({
      where: {
        userId_notificationId: {
          userId: session.user.id,
          notificationId: params.id,
        },
      },
      create: {
        userId: session.user.id,
        notificationId: params.id,
      },
      update: {},
    })
  } catch {
    // Nonexistent / foreign notification id — FK violation. Nothing to mark.
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
