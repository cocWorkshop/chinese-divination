export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deductCredits, getCost } from '@/lib/creditService'

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

    const body: ConsumeBody = await req.json().catch(() => ({}))
    const type = body.type || 'dayun_unlock'
    const configuredCost = await getCost(type)
    const cost = typeof body.amount === 'number' && body.amount >= 0 ? body.amount : configuredCost

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

    return NextResponse.json({
      success: true,
      remaining: user?.credits ?? 0,
      deducted: cost,
      type,
      note,
    })
  } catch (err: any) {
    console.error('Credits consume error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error', message: err?.message || 'Failed to consume credits' },
      { status: 500 }
    )
  }
}
