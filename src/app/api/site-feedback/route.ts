export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimiter'

const feedbackSchema = z.object({
  rating: z.union([z.number().int().min(1).max(5), z.string().regex(/^[1-5]$/).transform(Number)]).nullish(),
  feedback: z.string().trim().min(1, 'Feedback required').max(2000),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`site-feedback:${session.user.id}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = feedbackSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid feedback data' },
      { status: 400 }
    )
  }

  const { rating, feedback } = parsed.data

  const entry = await prisma.siteFeedback.create({
    data: {
      userId: session.user.id,
      rating: rating ?? null,
      feedback,
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
