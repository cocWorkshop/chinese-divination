export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPaid: true },
  })

  const targetFilter = user?.isPaid
    ? { in: ['all', 'paid'] }
    : { in: ['all', 'free'] }

  const total = await prisma.notification.count({
    where: {
      active: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
      target: targetFilter,
    },
  })

  const read = await prisma.notificationRead.count({
    where: {
      userId: session.user.id,
      notification: {
        active: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
        target: targetFilter,
      },
    },
  })

  return NextResponse.json({ count: total - read })
}
