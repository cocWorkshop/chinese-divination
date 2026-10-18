import { prisma } from '@/lib/prisma'
import { T } from '@/lib/i18n'

export const DEFAULT_MASTER_DAILY_TURN_LIMIT = 30

export interface MasterDailyLimitResult {
  allowed: boolean
  remaining: number
  maxLimit: number
  count: number
  message?: string
}

export function getDayStart(tzOffsetMin?: number | null): Date {
  const now = new Date()
  if (typeof tzOffsetMin === 'number' && !isNaN(tzOffsetMin)) {
    // Date.getTimezoneOffset() returns minutes (UTC - local), e.g. UTC+8 => -480
    const localNowMs = now.getTime() - tzOffsetMin * 60 * 1000
    const localDate = new Date(localNowMs)
    const localYear = localDate.getUTCFullYear()
    const localMonth = localDate.getUTCMonth()
    const localDay = localDate.getUTCDate()
    const localMidnightUtcMs = Date.UTC(localYear, localMonth, localDay) + tzOffsetMin * 60 * 1000
    return new Date(localMidnightUtcMs)
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function checkMasterDailyLimit(
  userId: string,
  lang: 'zh-TW' | 'en' = 'zh-TW',
  tzOffsetMin?: number | null,
): Promise<MasterDailyLimitResult> {
  const [user, setting] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    }),
    prisma.adminSetting.findUnique({
      where: { key: 'masterDailyTurnLimit' },
    }),
  ])

  const maxLimit = setting ? parseInt(setting.value, 10) || DEFAULT_MASTER_DAILY_TURN_LIMIT : DEFAULT_MASTER_DAILY_TURN_LIMIT

  // Admins are not subject to daily turn limits
  if (user?.isAdmin) {
    return {
      allowed: true,
      remaining: 999,
      maxLimit,
      count: 0,
    }
  }

  const dayStart = getDayStart(tzOffsetMin)

  const count = await prisma.masterChatMessage.count({
    where: {
      userId,
      role: 'user',
      createdAt: { gte: dayStart },
    },
  })

  if (count >= maxLimit) {
    const message = T(
      lang,
      '道友今日探討天機已深，神思宜斂。大化周流，過猶不及。今日且安歇凝神，明日若有疑，老夫再與道友論道。',
      'You have explored the workings of fate deeply today. In the art of divination, wisdom lies in knowing when to pause. Rest your mind tonight, and Master Xuanji welcomes you tomorrow.',
    )

    return {
      allowed: false,
      remaining: 0,
      maxLimit,
      count,
      message,
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxLimit - count),
    maxLimit,
    count,
  }
}
