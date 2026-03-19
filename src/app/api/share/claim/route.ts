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

  const [bonusSetting, bonus2Setting] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } }),
    prisma.adminSetting.findUnique({ where: { key: 'shareBonusModel2' } }),
  ])
  const bonus1 = parseInt(bonusSetting?.value ?? '20')
  const bonus2 = parseInt(bonus2Setting?.value ?? '0')

  const ops = [
    prisma.shareLink.update({
      where: { code },
      data: { used: true, usedBy: session.user.id, usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { bonusModel1: { increment: bonus1 }, ...(bonus2 > 0 && { bonusModel2: { increment: bonus2 } }) },
    }),
    prisma.user.update({
      where: { id: link.userId },
      data: { bonusModel1: { increment: bonus1 }, ...(bonus2 > 0 && { bonusModel2: { increment: bonus2 } }) },
    }),
  ]

  await prisma.$transaction(ops)

  return NextResponse.json({ success: true, bonusModel1: bonus1, bonusModel2: bonus2 })
}
