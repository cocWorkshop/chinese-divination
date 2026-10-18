export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logCreditChange } from '@/lib/creditLogger'
import { rateLimit } from '@/lib/rateLimiter'

const shareClaimSchema = z.object({
  code: z.string().trim().min(3).max(64),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`share-claim:${session.user.id}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many share claim attempts' }, { status: 429 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = shareClaimSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const { code } = parsed.data

  // AUD-09 / ISS-08: Require email verification before claiming share bonus to prevent bot farms
  const claimerUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  })
  if (!claimerUser?.emailVerified) {
    return NextResponse.json(
      { error: 'Email verification required', message: '請先驗證您的電子郵件後再領取分享善緣 / Please verify your email before claiming share bonus' },
      { status: 403 }
    )
  }

  const link = await prisma.shareLink.findUnique({ where: { code } })
  if (!link) return NextResponse.json({ error: 'Invalid share code' }, { status: 404 })
  if (link.used) return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  if (link.userId === session.user.id) return NextResponse.json({ error: 'Cannot claim own link' }, { status: 400 })

  const bonusSetting = await prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } })
  const bonus = parseInt(bonusSetting?.value ?? '5', 10) || 5

  // Atomic claim: the conditional `used: false` updateMany is the real guard.
  // Concurrent requests for the same code race on this single row write — only
  // the one that flips false→true (count === 1) grants credits, so the bonus
  // can't be duplicated by firing N parallel claims.
  let result: { claimerCredits: number; sharerCredits: number } | null = null
  await prisma.$transaction(async (tx) => {
    const claim = await tx.shareLink.updateMany({
      where: { code, used: false },
      data: { used: true, usedBy: session.user.id, usedAt: new Date() },
    })
    if (claim.count === 0) return // already claimed by a concurrent/previous request
    const claimer = await tx.user.update({
      where: { id: session.user.id },
      data: { credits: { increment: bonus } },
      select: { credits: true },
    })
    const sharer = await tx.user.update({
      where: { id: link.userId },
      data: { credits: { increment: bonus } },
      select: { credits: true },
    })
    result = { claimerCredits: claimer.credits, sharerCredits: sharer.credits }
  })

  if (!result) return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  const granted: { claimerCredits: number; sharerCredits: number } = result

  await Promise.all([
    logCreditChange({
      userId: session.user.id,
      action: 'grant_share',
      amount: bonus,
      balance: granted.claimerCredits,
      source: `share:${code}`,
      note: 'claimer',
    }),
    logCreditChange({
      userId: link.userId,
      action: 'grant_share',
      amount: bonus,
      balance: granted.sharerCredits,
      source: `share:${code}`,
      note: 'sharer',
    }),
  ])

  return NextResponse.json({ success: true, credits: bonus })
}
