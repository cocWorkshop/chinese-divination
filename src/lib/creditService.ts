import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'
import { logCreditChange } from './creditLogger'

/**
 * Credit/billing service (formerly rateLimit.ts — renamed to end the
 * confusion with rateLimiter.ts, which is the HTTP request-frequency
 * limiter. This module owns the credit ledger: pricing, checks, atomic
 * holds/deductions and the daily bonus).
 */

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
 * Batched variant of getCost for endpoints that need every cost at once
 * (e.g. /api/init) — one findMany instead of N findUnique round trips.
 * Same resolution rules as getCost.
 */
export async function getCosts(types: string[]): Promise<Record<string, number>> {
  const rows = await prisma.adminSetting.findMany({
    where: { key: { in: types.map((t) => `cost_${t}`) } },
    select: { key: true, value: true },
  })
  const overrides = new Map(rows.map((r) => [r.key, parseInt(r.value, 10)]))
  const out: Record<string, number> = {}
  for (const type of types) {
    const parsed = overrides.get(`cost_${type}`)
    out[type] = parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : DEFAULT_COSTS[type] ?? 3
  }
  return out
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
  // Determine which usage counter to increment. Whitelisted to one of the
  // three known fields — passed through Prisma's typed `data` via computed
  // property, so the schema is the source of truth (column rename → TS error).
  const usageField: 'usageDivination' | 'usageChat' | 'usageMaster' =
    ['bazi', 'ziwei', 'qimen', 'meihua', 'iching', 'liuyao', 'fengshui'].includes(type)
      ? 'usageDivination'
      : type === 'chat'
        ? 'usageChat'
        : type === 'master'
          ? 'usageMaster'
          : 'usageDivination'

  if (user?.isAdmin) {
    // Admin: no credit deduction but still track usage
    await prisma.user.update({
      where: { id: userId },
      data: { [usageField]: { increment: 1 } },
    })
    return true
  }
  if (cost <= 0) return true
  // Atomic: decrement credits + increment usage counter, only if credits ≥ cost.
  // updateMany lets us add the credits-gte gate to WHERE; it returns the row
  // count, which we need to detect "insufficient balance" (returns 0).
  const result = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: cost } },
    data: {
      credits: { decrement: cost },
      [usageField]: { increment: 1 },
    },
  })
  if (result.count > 0) {
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

/**
 * Atomically deduct the cost of `type` as a HOLD and return the amount held,
 * so the caller can record it (Reading.creditsHeld) for exact refunds.
 *
 * Same atomic guarantee as deductCredits (single guarded UPDATE — concurrent
 * holds against one balance can never over-deduct); the only difference is
 * the amount is returned. Admin users hold 0 (they are never charged).
 *
 * Returns { held: false } on insufficient balance.
 */
export async function holdCredits(
  userId: string,
  type: string
): Promise<{ held: boolean; amount: number }> {
  const cost = await getCost(type)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (user?.isAdmin || cost <= 0) {
    // Track usage like deductCredits does, but nothing to hold/refund.
    await prisma.user.update({
      where: { id: userId },
      data: { usageDivination: { increment: 1 } },
    }).catch(() => {})
    return { held: true, amount: 0 }
  }
  const result = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: cost } },
    data: {
      credits: { decrement: cost },
      usageDivination: { increment: 1 },
    },
  })
  if (result.count === 0) return { held: false, amount: 0 }
  const updated = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } })
  await logCreditChange({
    userId,
    action: 'deduct',
    amount: -cost,
    balance: updated?.credits ?? 0,
    source: `divination:${type}`,
    note: 'hold@init',
  })
  return { held: true, amount: cost }
}

/**
 * Atomic credit hold + pending-reading creation for /api/divination/init.
 *
 * The guarded decrement and the Reading row commit in ONE transaction, so a
 * process crash between them can never leave deducted credits with no
 * pending row for the stale sweeper to refund (the previous two-step flow
 * relied on a compensating refund that itself wrote no CreditLog entry).
 *
 * Returns null on insufficient balance. The ledger entry is written after
 * the transaction commits (an in-tx log insert would live on a different
 * connection and could survive a rolled-back commit).
 */
export async function holdCreditsAndCreateReading(
  userId: string,
  type: string,
  buildReadingData: (creditsHeld: number) => Prisma.ReadingUncheckedCreateInput
): Promise<{ held: true; amount: number; readingId: string } | null> {
  const cost = await getCost(type)

  const outcome = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
    if (user?.isAdmin || cost <= 0) {
      // Admin / free action: track usage like holdCredits, hold nothing.
      await tx.user.update({
        where: { id: userId },
        data: { usageDivination: { increment: 1 } },
      }).catch(() => {})
      const reading = await tx.reading.create({ data: buildReadingData(0) })
      return { amount: 0, readingId: reading.id }
    }
    const res = await tx.user.updateMany({
      where: { id: userId, credits: { gte: cost } },
      data: {
        credits: { decrement: cost },
        usageDivination: { increment: 1 },
      },
    })
    if (res.count === 0) return null
    const reading = await tx.reading.create({ data: buildReadingData(cost) })
    return { amount: cost, readingId: reading.id }
  })

  if (!outcome) return null

  if (outcome.amount > 0) {
    const updated = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } })
    await logCreditChange({
      userId,
      action: 'deduct',
      amount: -outcome.amount,
      balance: updated?.credits ?? 0,
      source: `divination:${type}`,
      note: 'hold@init',
    })
  }
  return { held: true, amount: outcome.amount, readingId: outcome.readingId }
}

/**
 * Refund a failed master turn (audit P4). Master credits are deducted
 * BEFORE streaming; when the engine yields a failure (LLM error, timeout,
 * client abort) the user received nothing for the charge — mirror the
 * divination hold/refund discipline. Best-effort: never throws (a failed
 * refund is logged, not propagated). Admins never pay (deductCredits skips
 * them), so they are skipped here too.
 */
export async function refundMasterCredits(userId: string, requestId?: string): Promise<void> {
  try {
    const [user, cost] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
      getCost('master'),
    ])
    if (!user || user.isAdmin || cost <= 0) return
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: cost } },
      select: { credits: true },
    })
    await logCreditChange({
      userId,
      action: 'refund',
      amount: cost,
      balance: updated.credits,
      source: 'master',
      note: requestId ? `refund failed master turn request=${requestId}` : 'refund failed master turn',
    })
  } catch (err) {
    console.error('[creditService] master turn refund failed:', err)
  }
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
