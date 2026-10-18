export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [payments, user] = await Promise.all([
    prisma.paymentRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        stripeSessionId: true,
        packId: true,
        amount: true,
        currency: true,
        credits: true,
        status: true,
        note: true,
        createdAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPaid: true, paidAt: true },
    }),
  ])

  const totalSpent = payments.reduce(
    (sum, p) => sum + (p.status === 'completed' ? p.amount : 0),
    0
  )

  return NextResponse.json({
    payments,
    isPaid: user?.isPaid ?? false,
    paidAt: user?.paidAt ?? null,
    totalSpent,
  })
}
