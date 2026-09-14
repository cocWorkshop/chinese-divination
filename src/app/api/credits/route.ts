export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, getCost } from '@/lib/creditService'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [creditCheck, timeoutSetting, costs, freeDaYunLimit, visibilityItems] = await Promise.all([
    checkCredits(session.user.id, 'bazi'), // just to get remaining
    prisma.adminSetting.findUnique({ where: { key: 'llmTimeoutSeconds' } }),
    Promise.all([
      getCost('bazi'), getCost('ziwei'), getCost('qimen'),
      getCost('meihua'), getCost('iching'), getCost('liuyao'),
      getCost('fengshui'), getCost('chat'), getCost('master'),
      getCost('dayun_unlock'),
    ]),
    prisma.adminSetting.findUnique({ where: { key: 'free_dayun_limit' } }).then(s => {
      const n = parseInt(s?.value || '3', 10)
      return isNaN(n) || n < 0 ? 3 : n
    }),
    prisma.adminSetting.findMany({ where: { key: { startsWith: 'visibility_' } } }),
  ])

  const [costBazi, costZiwei, costQimen, costMeihua, costIching, costLiuyao, costFengshui, costChat, costMaster, costDayunUnlock] = costs
  const llmTimeoutSeconds = parseInt(timeoutSetting?.value || '240', 10) || 240

  // Build visibility map
  const visibilityMap: Record<string, boolean> = {}
  for (const item of visibilityItems) {
    const type = item.key.replace('visibility_', '')
    try {
      const parsed = JSON.parse(item.value)
      visibilityMap[type] = parsed.visible !== false
    } catch {
      visibilityMap[type] = true
    }
  }

  return NextResponse.json({
    credits: creditCheck.remaining,
    // Legacy fields for backward compatibility
    divination: { remaining: creditCheck.remaining },
    chat: { remaining: creditCheck.remaining },
    llmTimeoutSeconds,
    costs: {
      bazi: costBazi, ziwei: costZiwei, qimen: costQimen,
      meihua: costMeihua, iching: costIching, liuyao: costLiuyao,
      fengshui: costFengshui, chat: costChat, master: costMaster,
      dayun_unlock: costDayunUnlock,
    },
    rules: {
      freeDaYunLimit,
      costDayunUnlock,
    },
    visibility: visibilityMap,
  })
}
