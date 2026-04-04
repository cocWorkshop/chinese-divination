import { prisma } from './prisma'
import { logCreditChange } from './creditLogger'

// Default costs per divination type (overridden by AdminSetting)
const DEFAULT_COSTS: Record<string, number> = {
  bazi: 5,
  ziwei: 5,
  qimen: 5,
  meihua: 3,
  iching: 3,
  liuyao: 3,
  fengshui: 3,
  chat: 2,
  master: 1,
}

/**
 * Get the cost for a given action type from AdminSettings.
 * Keys: cost_bazi, cost_ziwei, cost_qimen, cost_meihua, cost_iching, cost_liuyao, cost_fengshui, cost_chat
 */
export async function getCost(type: string): Promise<number> {
  const setting = await prisma.adminSetting.findUnique({
    where: { key: `cost_${type}` },
  })
  if (setting) {
    const val = parseInt(setting.value, 10)
    if (!isNaN(val) && val >= 0) return val
  }
  return DEFAULT_COSTS[type] ?? 3
}

/**
 * Check if user has enough credits for a given action.
 */
export async function checkCredits(userId: string, type: string): Promise<{ allowed: boolean; remaining: number; cost: number }> {
  const [user, cost] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, credits: true },
    }),
    getCost(type),
  ])
  if (!user) return { allowed: false, remaining: 0, cost }
  if (user.isAdmin) return { allowed: true, remaining: 999, cost }
  return { allowed: user.credits >= cost, remaining: user.credits, cost }
}

/**
 * Deduct credits for a given action. Returns true if successful.
 */
export async function deductCredits(userId: string, type: string): Promise<boolean> {
  const [user, cost] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    }),
    getCost(type),
  ])
  // Determine which usage counter to increment
  const usageField = ['bazi','ziwei','qimen','meihua','iching','liuyao','fengshui'].includes(type)
    ? 'usageDivination'
    : type === 'chat' ? 'usageChat'
    : type === 'master' ? 'usageMaster'
    : 'usageDivination'

  if (user?.isAdmin) {
    // Admin: no credit deduction but still track usage
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "${usageField}" = "${usageField}" + 1 WHERE id = $1`,
      userId
    )
    return true
  }
  if (cost <= 0) return true
  // Atomic: decrement credits + increment usage counter
  const result = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "credits" = "credits" - $1, "${usageField}" = "${usageField}" + 1 WHERE id = $2 AND "credits" >= $1`,
    cost, userId
  )
  if (result > 0) {
    // Query balance after deduction for audit log
    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } })
    logCreditChange({
      userId,
      action: 'deduct',
      amount: -cost,
      balance: updated?.credits ?? 0,
      source: type === 'chat' ? 'chat' : type === 'master' ? 'master' : `divination:${type}`,
    })
    return true
  }
  return false
}

// Legacy wrappers for backward compatibility during migration
export async function checkDivinationCredits(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const r = await checkCredits(userId, 'bazi')
  return { allowed: r.allowed, remaining: r.remaining }
}

export async function deductDivinationCredit(userId: string): Promise<boolean> {
  // This should not be called anymore — use deductCredits(userId, type) instead
  return deductCredits(userId, 'bazi')
}

export async function checkChatCredits(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const r = await checkCredits(userId, 'chat')
  return { allowed: r.allowed, remaining: r.remaining }
}

export async function deductChatCredit(userId: string): Promise<boolean> {
  return deductCredits(userId, 'chat')
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getUTCFullYear() === d2.getUTCFullYear()
    && d1.getUTCMonth() === d2.getUTCMonth()
    && d1.getUTCDate() === d2.getUTCDate()
}

export async function grantDailyBonus(userId: string): Promise<{ granted: boolean; credits: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, lastDailyBonus: true },
  })
  if (!user) return { granted: false, credits: 0 }
  if (user.isAdmin) return { granted: false, credits: 0 }

  const now = new Date()
  if (user.lastDailyBonus && isSameDay(user.lastDailyBonus, now)) {
    return { granted: false, credits: 0 }
  }

  const setting = await prisma.adminSetting.findUnique({ where: { key: 'dailyBonusCredits' } })
  const bonus = parseInt(setting?.value ?? '2', 10) || 2

  // Atomic update: only grant if lastDailyBonus is not today (prevents race condition)
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const rowsUpdated = await prisma.$executeRaw`
    UPDATE "User"
    SET credits = credits + ${bonus},
        "lastDailyBonus" = ${now}
    WHERE id = ${userId}
      AND ("lastDailyBonus" IS NULL OR "lastDailyBonus" < ${todayStart})
  `

  if (rowsUpdated === 0) {
    return { granted: false, credits: 0 }
  }

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })
  logCreditChange({
    userId,
    action: 'grant_daily',
    amount: bonus,
    balance: updated?.credits ?? 0,
    source: 'daily_bonus',
  })
  return { granted: true, credits: bonus }
}
