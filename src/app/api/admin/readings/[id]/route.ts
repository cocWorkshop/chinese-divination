export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const reading = await prisma.reading.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      familyMember: { select: { name: true, relation: true } },
      feedbacks: { select: { rating: true, feedback: true, createdAt: true } },
    },
  })

  if (!reading) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ reading })
}
