export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const link = await prisma.shareLink.findUnique({ where: { code } })
  if (!link) return NextResponse.json({ error: 'Invalid share code' }, { status: 404 })
  if (link.used) return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
  if (link.userId === session.user.id) return NextResponse.json({ error: 'Cannot claim own link' }, { status: 400 })

  const [bonusSetting, chatBonusSetting] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } }),
    prisma.adminSetting.findUnique({ where: { key: 'shareBonusChat' } }),
  ])
  const bonus = parseInt(bonusSetting?.value ?? '1')
  const chatBonus = parseInt(chatBonusSetting?.value ?? '2')

  const ops = [
    prisma.shareLink.update({
      where: { code },
      data: { used: true, usedBy: session.user.id, usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        divinationCredits: { increment: bonus },
        chatCredits: { increment: chatBonus },
      },
    }),
    prisma.user.update({
      where: { id: link.userId },
      data: {
        divinationCredits: { increment: bonus },
        chatCredits: { increment: chatBonus },
      },
    }),
  ]

  await prisma.$transaction(ops)

  return NextResponse.json({ success: true, divinationCredits: bonus, chatCredits: chatBonus })
}
