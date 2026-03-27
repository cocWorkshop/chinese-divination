export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isPaid: true },
  })

  const targetFilter = user?.isPaid
    ? { in: ['all', 'paid'] }
    : { in: ['all', 'free'] }

  const notifications = await prisma.notification.findMany({
    where: {
      active: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
      target: targetFilter,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      reads: {
        where: { userId: session.user.id },
        select: { readAt: true },
      },
    },
  })

  const result = notifications.map(n => ({
    id: n.id,
    title: n.title,
    titleEn: n.titleEn,
    content: n.content,
    contentEn: n.contentEn,
    type: n.type,
    createdAt: n.createdAt,
    read: n.reads.length > 0,
    readAt: n.reads[0]?.readAt || null,
  }))

  return NextResponse.json(result)
}
