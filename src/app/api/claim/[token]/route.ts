export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logCreditChange } from '@/lib/creditLogger'

// GET: check compensation status (for claim page)
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const comp = await prisma.compensation.findUnique({ where: { token } })

  if (!comp) {
    return NextResponse.json({ status: 'invalid' })
  }
  if (comp.status === 'claimed') {
    return NextResponse.json({ status: 'claimed', claimedAt: comp.claimedAt })
  }
  if (comp.expiresAt && new Date() > comp.expiresAt) {
    // Mark expired
    if (comp.status !== 'expired') {
      await prisma.compensation.update({ where: { id: comp.id }, data: { status: 'expired' } })
    }
    return NextResponse.json({ status: 'expired' })
  }
  if (comp.status === 'pending') {
    return NextResponse.json({ status: 'not_sent' })
  }

  return NextResponse.json({
    status: 'ready',
    email: comp.email,
    divinationCredits: comp.bonusModel1,
    chatCredits: comp.bonusChat,
    reason: comp.reason,
  })
}

// POST: claim compensation
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const comp = await prisma.compensation.findUnique({ where: { token } })

  if (!comp) {
    return NextResponse.json({ error: 'invalid', message: '補償連結無效' }, { status: 404 })
  }
  if (comp.status === 'claimed') {
    return NextResponse.json({ error: 'claimed', message: '此補償已領取' }, { status: 400 })
  }
  if (comp.expiresAt && new Date() > comp.expiresAt) {
    await prisma.compensation.update({ where: { id: comp.id }, data: { status: 'expired' } })
    return NextResponse.json({ error: 'expired', message: '此補償已過期' }, { status: 400 })
  }
  if (comp.status === 'pending') {
    return NextResponse.json({ error: 'not_sent', message: '此補償尚未發送' }, { status: 400 })
  }

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: comp.email } })
  if (!user) {
    return NextResponse.json({ error: 'no_account', message: '找不到此電郵對應的帳戶，請先註冊' }, { status: 404 })
  }

  // Apply credits atomically. The conditional `status: 'sent'` updateMany is the
  // real guard: it flips sent→claimed for exactly one of any concurrent requests,
  // so the compensation can't be granted twice by firing parallel claims. The
  // grant runs in the same transaction, so a failed grant rolls the flip back.
  const totalCompCredits = comp.bonusModel1 + comp.bonusChat
  let newBalance: number | null = null
  await prisma.$transaction(async (tx) => {
    const claim = await tx.compensation.updateMany({
      where: { id: comp.id, status: 'sent' },
      data: { status: 'claimed', claimedAt: new Date(), userId: user.id },
    })
    if (claim.count === 0) return // raced / already claimed
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        divinationCredits: { increment: comp.bonusModel1 },
        chatCredits: { increment: comp.bonusChat },
        credits: { increment: totalCompCredits },
      },
      select: { credits: true },
    })
    newBalance = updated.credits
  })

  if (newBalance === null) {
    return NextResponse.json({ error: 'claimed', message: '此補償已領取' }, { status: 400 })
  }

  await logCreditChange({
    userId: user.id,
    action: 'grant_compensation',
    amount: totalCompCredits,
    balance: newBalance,
    source: `compensation:${comp.id}`,
    note: comp.reason,
  })

  return NextResponse.json({
    success: true,
    divinationCredits: comp.bonusModel1,
    chatCredits: comp.bonusChat,
  })
}
