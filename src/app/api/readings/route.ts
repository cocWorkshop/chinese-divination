export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // No `take` cap: the dashboard fetches the full list once and paginates
  // client-side ("Load more"), and shows a total count ("共 N 條記錄").
  // Capping here would silently stop pagination and report a wrong total.
  const readings = await prisma.reading.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      familyMember: { select: { relation: true, name: true } },
    },
  })

  return NextResponse.json({ readings })
}
