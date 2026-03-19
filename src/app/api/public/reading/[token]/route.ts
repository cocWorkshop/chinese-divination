export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const reading = await prisma.reading.findFirst({
    where: { shareToken: token, deletedAt: null },
    select: {
      type: true,
      result: true,
      language: true,
      createdAt: true,
      question: true,
      inputData: true,
      user: { select: { name: true } },
    },
  })

  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    type: reading.type,
    result: reading.result,
    language: reading.language,
    createdAt: reading.createdAt,
    question: reading.question,
    inputData: reading.inputData,
    authorName: reading.user?.name || null,
  })
}
