export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deductCredits, getCost } from '@/lib/creditService'
import { rateLimit } from '@/lib/rateLimiter'
import { isDaYunUnlocked } from '@/lib/baziCalculator'

interface ConsumeBody {
  type?: string
  amount?: number
  reason?: string
  decadeIndex?: number
  readingId?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '請先登入後再進行機緣解鎖 / Please login to unlock' },
        { status: 401 }
      )
    }

    if (!rateLimit(`credits-consume:${session.user.id}`, 10, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body: ConsumeBody = await req.json().catch(() => ({}))
    const type = body.type || 'dayun_unlock'
    const configuredCost = await getCost(type)
    const cost = typeof body.amount === 'number' && body.amount >= 0 ? body.amount : configuredCost

    // If dayun_unlock with readingId and decadeIndex, validate and idempotently handle (AUD-02, AUD-03)
    let existingReadingData: Record<string, any> | null = null
    if (type === 'dayun_unlock' && body.readingId && typeof body.decadeIndex === 'number') {
      const reading = await prisma.reading.findFirst({
        where: { id: body.readingId, userId: session.user.id, deletedAt: null },
      })
      if (!reading) {
        return NextResponse.json({ error: 'Reading not found' }, { status: 404 })
      }
      try {
        existingReadingData = JSON.parse(reading.result)
      } catch {
        return NextResponse.json({ error: 'Corrupt reading data' }, { status: 500 })
      }

      if (!existingReadingData) {
        return NextResponse.json({ error: 'Corrupt reading data' }, { status: 500 })
      }

      const currentUnlocked = (existingReadingData.unlockedDecades as number[]) || []
      // If already unlocked (either < 3 or already recorded), treat as idempotent success
      if (isDaYunUnlocked(body.decadeIndex, currentUnlocked)) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { credits: true },
        })
        return NextResponse.json({
          success: true,
          remaining: user?.credits ?? 0,
          deducted: 0,
          type,
          unlockedDecades: currentUnlocked,
          message: 'Already unlocked',
        })
      }
    }

    const note =
      body.reason ||
      (type === 'dayun_unlock'
        ? `大運解鎖：解鎖第 ${(body.decadeIndex ?? 0) + 1} 步大運流年精批`
        : `消耗機緣：${type}`)

    const success = await deductCredits(session.user.id, type, note)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, isAdmin: true },
    })

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: '機緣點不足，請先充值或通過每日簽到、分享獲取機緣 / Insufficient Karma credits',
          remaining: user?.credits ?? 0,
          cost,
        },
        { status: 402 }
      )
    }

    // Persist unlockedDecades to reading if applicable
    let updatedUnlockedDecades: number[] | undefined
    if (type === 'dayun_unlock' && body.readingId && typeof body.decadeIndex === 'number' && existingReadingData) {
      const currentUnlocked = (existingReadingData.unlockedDecades as number[]) || []
      updatedUnlockedDecades = Array.from(new Set([...currentUnlocked, body.decadeIndex]))
      existingReadingData.unlockedDecades = updatedUnlockedDecades
      await prisma.reading.update({
        where: { id: body.readingId },
        data: { result: JSON.stringify(existingReadingData) },
      })
    }

    return NextResponse.json({
      success: true,
      remaining: user?.credits ?? 0,
      deducted: cost,
      type,
      note,
      unlockedDecades: updatedUnlockedDecades,
    })
  } catch (err: any) {
    console.error('Credits consume error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error', message: err?.message || 'Failed to consume credits' },
      { status: 500 }
    )
  }
}
