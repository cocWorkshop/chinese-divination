export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, getCost } from '@/lib/rateLimit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [creditCheck, timeoutSetting, costs] = await Promise.all([
    checkCredits(session.user.id, 'bazi'), // just to get remaining
    prisma.adminSetting.findUnique({ where: { key: 'llmTimeoutSeconds' } }),
    Promise.all([
      getCost('bazi'), getCost('ziwei'), getCost('qimen'),
      getCost('meihua'), getCost('iching'), getCost('liuyao'),
      getCost('fengshui'), getCost('chat'),
    ]),
  ])

  const [costBazi, costZiwei, costQimen, costMeihua, costIching, costLiuyao, costFengshui, costChat] = costs
  const llmTimeoutSeconds = parseInt(timeoutSetting?.value || '240', 10) || 240

  return NextResponse.json({
    credits: creditCheck.remaining,
    // Legacy fields for backward compatibility
    divination: { remaining: creditCheck.remaining },
    chat: { remaining: creditCheck.remaining },
    llmTimeoutSeconds,
    costs: {
      bazi: costBazi, ziwei: costZiwei, qimen: costQimen,
      meihua: costMeihua, iching: costIching, liuyao: costLiuyao,
      fengshui: costFengshui, chat: costChat,
    },
  })
}
