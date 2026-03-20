import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    bonusModel1: comp.bonusModel1,
    bonusModel2: comp.bonusModel2,
    bonusChat: comp.bonusChat,
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

  // Apply bonuses
  await prisma.user.update({
    where: { id: user.id },
    data: {
      bonusModel1: { increment: comp.bonusModel1 },
      bonusModel2: { increment: comp.bonusModel2 },
      bonusChat: { increment: comp.bonusChat },
    },
  })

  // Mark claimed
  await prisma.compensation.update({
    where: { id: comp.id },
    data: { status: 'claimed', claimedAt: new Date(), userId: user.id },
  })

  return NextResponse.json({
    success: true,
    bonusModel1: comp.bonusModel1,
    bonusModel2: comp.bonusModel2,
    bonusChat: comp.bonusChat,
  })
}
