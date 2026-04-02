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
    return NextResponse.json({ status: 'exhausted' })
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

  // Grant credits + record claim in transaction
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { increment: link.credits } },
      select: { credits: true },
    }),
    prisma.giftClaim.create({
      data: {
        giftLinkId: link.id,
        userId: session.user.id,
        credits: link.credits,
      },
    }),
    prisma.giftLink.update({
      where: { id: link.id },
      data: { claimCount: { increment: 1 } },
    }),
  ])

  logCreditChange({
    userId: session.user.id,
    action: 'grant_gift',
    amount: link.credits,
    balance: updatedUser.credits,
    source: `gift:${link.code}`,
    note: link.note || undefined,
  })

  return NextResponse.json({ success: true, credits: link.credits })
}
