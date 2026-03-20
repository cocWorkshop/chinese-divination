import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rating, feedback } = await req.json()
  if (!feedback?.trim()) return NextResponse.json({ error: 'Feedback required' }, { status: 400 })

  const entry = await prisma.siteFeedback.create({
    data: {
      userId: session.user.id,
      rating: rating ? Math.min(5, Math.max(1, parseInt(rating))) : null,
      feedback: String(feedback).slice(0, 2000),
    },
  })

  return NextResponse.json({ id: entry.id })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const feedbacks = await prisma.siteFeedback.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({ feedbacks })
}
