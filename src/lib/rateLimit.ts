import { prisma } from './prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  used: number
  dailyLimit: number
  bonus: number
  resetAt: Date
}

async function getSetting(key: string, fallback: string): Promise<string> {
  const s = await prisma.adminSetting.findUnique({ where: { key } })
  return s?.value ?? fallback
}

export async function checkModelLimit(userId: string, modelTier: 'model1' | 'model2'): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPaid: true, isAdmin: true, bonusModel1: true, bonusModel2: true },
  })
  
  if (user?.isAdmin) {
    return { allowed: true, remaining: 999, used: 0, dailyLimit: -1, bonus: 0, resetAt: new Date() }
  }

  const isPaid = user?.isPaid ?? false
  const bonus = modelTier === 'model1' ? (user?.bonusModel1 ?? 0) : (user?.bonusModel2 ?? 0)

  let limitKey: string
  if (isPaid) {
    limitKey = modelTier === 'model1' ? 'paidDailyModel1' : 'paidDailyModel2'
  } else {
    limitKey = modelTier === 'model1' ? 'freeDailyModel1' : 'freeDailyModel2'
  }
  
  const dailyLimitStr = await getSetting(limitKey, modelTier === 'model1' ? '20' : '2')
  const dailyLimit = parseInt(dailyLimitStr)
  
  if (dailyLimit === -1) {
    return { allowed: true, remaining: 999, used: 0, dailyLimit: -1, bonus, resetAt: new Date() }
  }

  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const resetAt = new Date(windowStart)
  resetAt.setUTCDate(resetAt.getUTCDate() + 1)

  const record = await prisma.rateLimit.findFirst({
    where: { userId, windowStart, modelTier },
  })
  const used = record?.count ?? 0
  
  const totalAvailable = dailyLimit + bonus
  const allowed = used < totalAvailable
  const remaining = Math.max(0, totalAvailable - used)

  return { allowed, remaining, used, dailyLimit, bonus, resetAt }
}

export async function incrementModelUsage(userId: string, modelTier: 'model1' | 'model2'): Promise<void> {
  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  await prisma.rateLimit.upsert({
    where: { userId_windowStart_modelTier: { userId, windowStart, modelTier } },
    create: { userId, windowStart, modelTier, count: 1 },
    update: { count: { increment: 1 } },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPaid: true, bonusModel1: true, bonusModel2: true },
  })
  
  const isPaid = user?.isPaid ?? false
  const limitKey = isPaid 
    ? (modelTier === 'model1' ? 'paidDailyModel1' : 'paidDailyModel2')
    : (modelTier === 'model1' ? 'freeDailyModel1' : 'freeDailyModel2')
  const setting = await prisma.adminSetting.findUnique({ where: { key: limitKey } })
  const dailyLimit = parseInt(setting?.value ?? '20')

  const record = await prisma.rateLimit.findFirst({
    where: { userId, windowStart, modelTier },
  })
  const newCount = record?.count ?? 1

  if (dailyLimit >= 0 && newCount > dailyLimit) {
    const bonusField = modelTier === 'model1' ? 'bonusModel1' : 'bonusModel2'
    const currentBonus = modelTier === 'model1' ? (user?.bonusModel1 ?? 0) : (user?.bonusModel2 ?? 0)
    if (currentBonus > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { [bonusField]: { decrement: 1 } },
      })
    }
  }
}

// Legacy compatibility
export async function checkRateLimit(userId: string): Promise<RateLimitResult & { quota: number }> {
  const result = await checkModelLimit(userId, 'model1')
  return { ...result, quota: result.dailyLimit }
}
