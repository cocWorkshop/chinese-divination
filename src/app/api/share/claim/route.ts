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

  const bonusSetting = await prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } })
  const bonus = parseInt(bonusSetting?.value ?? '5')

  const ops = [
    prisma.shareLink.update({
      where: { code },
      data: { used: true, usedBy: session.user.id, usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { credits: { increment: bonus } },
    }),
    prisma.user.update({
      where: { id: link.userId },
      data: { credits: { increment: bonus } },
    }),
  ]

  await prisma.$transaction(ops)

  return NextResponse.json({ success: true, credits: bonus })
}
