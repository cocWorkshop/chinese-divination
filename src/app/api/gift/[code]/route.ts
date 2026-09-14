export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logCreditChange } from '@/lib/creditLogger'

// GET: check gift link status
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const link = await prisma.giftLink.findUnique({
    where: { code },
    include: { _count: { select: { claims: true } } },
  })

  if (!link || !link.enabled) {
    return NextResponse.json({ status: 'invalid' })
  }
  if (link.expiresAt && new Date() > link.expiresAt) {
    return NextResponse.json({ status: 'expired' })
  }
  if (link.maxClaims > 0 && link.claimCount >= link.maxClaims) {
    return NextResponse.json({ status: 'exhausted', claimCount: link.claimCount, maxClaims: link.maxClaims })
  }

  // Check if current user already claimed
  const session = await auth()
  let alreadyClaimed = false
  if (session?.user?.id) {
    const existing = await prisma.giftClaim.findUnique({
      where: { giftLinkId_userId: { giftLinkId: link.id, userId: session.user.id } },
    })
    alreadyClaimed = !!existing
  }

  return NextResponse.json({
    status: alreadyClaimed ? 'already_claimed' : 'ready',
    credits: link.credits,
    note: link.note,
    claimCount: link.claimCount,
    maxClaims: link.maxClaims,
  })
}

// POST: claim gift
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized', message: '請先登入' }, { status: 401 })
  }

  const link = await prisma.giftLink.findUnique({ where: { code } })

  if (!link || !link.enabled) {
    return NextResponse.json({ error: 'invalid', message: '此連結無效' }, { status: 404 })
  }
  if (link.expiresAt && new Date() > link.expiresAt) {
    return NextResponse.json({ error: 'expired', message: '此連結已過期' }, { status: 400 })
  }
  if (link.maxClaims > 0 && link.claimCount >= link.maxClaims) {
    return NextResponse.json({ error: 'exhausted', message: '此連結已被領完' }, { status: 400 })
  }

  // Check duplicate
  const existing = await prisma.giftClaim.findUnique({
    where: { giftLinkId_userId: { giftLinkId: link.id, userId: session.user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'already_claimed', message: '您已領取過此禮品' }, { status: 400 })
  }

  // Grant credits + record claim in one transaction. The pre-checks above
  // are fast paths only — inside the tx, atomicity comes from:
  //   * giftClaim.create hitting the (giftLinkId,userId) unique constraint
  //     on a same-user race (P2002 → whole tx rolls back);
  //   * the guarded updateMany reserving the claim seat — concurrent claims
  //     on the last slot can't both pass `claimCount < maxClaims`.
  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.giftClaim.create({
        data: {
          giftLinkId: link.id,
          userId: session.user.id,
          credits: link.credits,
        },
      })

      const seat = await tx.giftLink.updateMany({
        where: {
          id: link.id,
          // maxClaims = 0 means unlimited
          OR: [{ maxClaims: 0 }, { claimCount: { lt: link.maxClaims } }],
        },
        data: { claimCount: { increment: 1 } },
      })
      if (seat.count === 0) throw new Error('GIFT_EXHAUSTED')

      return tx.user.update({
        where: { id: session.user.id },
        data: { credits: { increment: link.credits } },
        select: { credits: true },
      })
    })

    logCreditChange({
      userId: session.user.id,
      action: 'grant_gift',
      amount: link.credits,
      balance: updatedUser.credits,
      source: `gift:${link.code}`,
      note: link.note || undefined,
    })

    return NextResponse.json({ success: true, credits: link.credits })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'already_claimed', message: '您已領取過此禮品' }, { status: 400 })
    }
    if (e instanceof Error && e.message === 'GIFT_EXHAUSTED') {
      return NextResponse.json({ error: 'exhausted', message: '此連結已被領完' }, { status: 400 })
    }
    throw e
  }
}
