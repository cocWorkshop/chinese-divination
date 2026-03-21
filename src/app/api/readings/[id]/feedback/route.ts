export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { rating, feedback } = await req.json()

    if (rating !== undefined && rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })
    }

    // Verify reading exists
    const reading = await prisma.reading.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!reading) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 })
    }

    // Upsert feedback
    const fb = await prisma.readingFeedback.upsert({
      where: { readingId_userId: { readingId: id, userId: session.user.id } },
      create: {
        readingId: id,
        userId: session.user.id,
        ...(rating !== undefined && { rating }),
        ...(feedback !== undefined && { feedback: feedback || null }),
      },
      update: {
        ...(rating !== undefined && { rating }),
        ...(feedback !== undefined && { feedback: feedback || null }),
      },
      select: { rating: true, feedback: true },
    })

    // Denormalize rating to Reading for quick display
    if (rating !== undefined && reading) {
      await prisma.reading.update({
        where: { id },
        data: { rating },
      }).catch(() => {})
    }

    return NextResponse.json(fb)
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const fb = await prisma.readingFeedback.findUnique({
      where: { readingId_userId: { readingId: id, userId: session.user.id } },
      select: { rating: true, feedback: true },
    })

    return NextResponse.json(fb || { rating: null, feedback: null })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
