export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, getCost, grantDailyBonus } from '@/lib/rateLimit'

const DEFAULT_VISIBILITY = [
  { type: 'bazi', visible: true, order: 1 },
  { type: 'ziwei', visible: true, order: 2 },
  { type: 'liuyao', visible: true, order: 3 },
  { type: 'qimen', visible: true, order: 4 },
  { type: 'fengshui', visible: true, order: 5 },
  { type: 'meihua', visible: true, order: 6 },
  { type: 'iching', visible: false, order: 7 },
]

async function getVisibility() {
  try {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: 'divination_visibility' },
    })
    if (setting) {
      const parsed = JSON.parse(setting.value)
      if (Array.isArray(parsed)) {
        const items = parsed as { type: string; visible: boolean; order: number }[]
        const existingTypes = new Set(items.map(i => i.type))
        let maxOrder = Math.max(...items.map(i => i.order), 0)
        for (const def of DEFAULT_VISIBILITY) {
          if (!existingTypes.has(def.type)) {
            items.push({ type: def.type, visible: def.visible, order: ++maxOrder })
          }
        }
        return items.sort((a, b) => a.order - b.order)
      }
      const oldFormat = parsed as Record<string, boolean>
      return DEFAULT_VISIBILITY.map((def, i) => ({
        type: def.type,
        visible: oldFormat[def.type] ?? def.visible,
        order: i + 1,
      }))
    }
    return DEFAULT_VISIBILITY
  } catch {
    return DEFAULT_VISIBILITY
  }
}

export async function GET() {
  const session = await auth()

  // Visibility is always public
  const visibilityPromise = getVisibility()

  if (!session?.user?.id) {
    const visibility = await visibilityPromise
    return NextResponse.json({ visibility })
  }

  const userId = session.user.id

  // Grant daily bonus first (before checking credits so counts reflect bonus)
  const dailyBonusResult = await grantDailyBonus(userId)

  const [creditCheck, timeoutSetting, bonusDiv, bonusChat, user, familyMembers, visibility, costs] = await Promise.all([
    checkCredits(userId, 'bazi'),
    prisma.adminSetting.findUnique({ where: { key: 'llmTimeoutSeconds' } }),
    prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } }),
    prisma.adminSetting.findUnique({ where: { key: 'shareBonusChat' } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        birthDate: true, birthTime: true, birthPlace: true,
        gender: true, calendarType: true, timeMode: true, exactTime: true,
        birthEnvironment: true, birthLat: true, birthLng: true,
      },
    }),
    prisma.familyMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    visibilityPromise,
    Promise.all([
      getCost('bazi'), getCost('ziwei'), getCost('qimen'),
      getCost('meihua'), getCost('iching'), getCost('liuyao'),
      getCost('fengshui'), getCost('chat'),
    ]),
  ])

  const [costBazi, costZiwei, costQimen, costMeihua, costIching, costLiuyao, costFengshui, costChat] = costs
  const llmTimeoutSeconds = parseInt(timeoutSetting?.value || '240', 10) || 240

  return NextResponse.json({
    credits: {
      credits: creditCheck.remaining,
      // Legacy fields
      divination: { remaining: creditCheck.remaining },
      chat: { remaining: creditCheck.remaining },
      llmTimeoutSeconds,
      costs: {
        bazi: costBazi, ziwei: costZiwei, qimen: costQimen,
        meihua: costMeihua, iching: costIching, liuyao: costLiuyao,
        fengshui: costFengshui, chat: costChat,
      },
    },
    profile: user || null,
    shareBonus: {
      divination: parseInt(bonusDiv?.value ?? '20'),
      chat: parseInt(bonusChat?.value ?? '5'),
    },
    familyMembers,
    visibility,
    dailyBonusGranted: dailyBonusResult.granted,
    dailyBonus: dailyBonusResult.granted ? { credits: dailyBonusResult.credits } : undefined,
  })
}
