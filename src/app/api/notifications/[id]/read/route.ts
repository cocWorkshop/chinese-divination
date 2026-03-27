export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  return NextResponse.json({ success: true })
}
