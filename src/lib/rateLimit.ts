import { prisma } from './prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  used: number
  dailyLimit: number
  bonus: number
  resetAt: Date
}

type ResourceType = 'model1' | 'model2' | 'chat'

const DEFAULTS: Record<string, Record<ResourceType, number>> = {
  arcane:    { model1: 20, model2: 2,  chat: 3  },
  ethereal:  { model1: -1, model2: 20, chat: 10 },
  prestige:  { model1: -1, model2: -1, chat: -1 },
  admin:     { model1: -1, model2: -1, chat: -1 },
}

const BONUS_FIELDS: Record<ResourceType, 'bonusModel1' | 'bonusModel2' | 'bonusChat'> = {
  model1: 'bonusModel1',
  model2: 'bonusModel2',
  chat: 'bonusChat',
}

function getWindowStart(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function getResetAt(): Date {
  const reset = getWindowStart()
  reset.setUTCDate(reset.getUTCDate() + 1)
  return reset
}

async function getRoleLimit(role: string, resource: ResourceType): Promise<number> {
  const key = `${role}_daily_${resource}`
  const s = await prisma.adminSetting.findUnique({ where: { key } })
  if (s) return parseInt(s.value)
  return DEFAULTS[role]?.[resource] ?? DEFAULTS.arcane[resource]
}

// Unified check for any resource type
export async function checkLimit(userId: string, resource: ResourceType): Promise<RateLimitResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isAdmin: true, bonusModel1: true, bonusModel2: true, bonusChat: true },
  })

  const role = user?.isAdmin ? 'admin' : (user?.role || 'arcane')
  const bonusField = BONUS_FIELDS[resource]
  const bonus = (user as Record<string, unknown>)?.[bonusField] as number ?? 0
  const windowStart = getWindowStart()
  const modelTier = resource // RateLimit table uses modelTier for all resource types

  // Always fetch actual usage (even for admin/unlimited)
  const record = await prisma.rateLimit.findFirst({
    where: { userId, windowStart, modelTier },
  })
  const used = record?.count ?? 0

  const dailyLimit = await getRoleLimit(role, resource)

  if (dailyLimit === -1) {
    return { allowed: true, remaining: 999, used, dailyLimit: -1, bonus, resetAt: getResetAt() }
  }

  const totalAvailable = dailyLimit + bonus
  const allowed = used < totalAvailable
  const remaining = Math.max(0, totalAvailable - used)

  return { allowed, remaining, used, dailyLimit, bonus, resetAt: getResetAt() }
}

// Unified increment for any resource type
export async function incrementUsage(userId: string, resource: ResourceType): Promise<void> {
  const windowStart = getWindowStart()
  const modelTier = resource

  await prisma.rateLimit.upsert({
    where: { userId_windowStart_modelTier: { userId, windowStart, modelTier } },
    create: { userId, windowStart, modelTier, count: 1 },
    update: { count: { increment: 1 } },
  })

  // Check if over daily limit → consume bonus
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, bonusModel1: true, bonusModel2: true, bonusChat: true },
  })

  const role = user?.role || 'arcane'
  const dailyLimit = await getRoleLimit(role, resource)

  if (dailyLimit === -1) return // unlimited, no bonus consumption

  const record = await prisma.rateLimit.findFirst({
    where: { userId, windowStart, modelTier },
  })
  const newCount = record?.count ?? 1

  if (newCount > dailyLimit) {
    const bonusField = BONUS_FIELDS[resource]
    const currentBonus = (user as Record<string, unknown>)?.[bonusField] as number ?? 0
    if (currentBonus > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { [bonusField]: { decrement: 1 } },
      })
    }
  }
}

// ===== Backward-compatible wrappers =====
export async function checkModelLimit(userId: string, modelTier: 'model1' | 'model2'): Promise<RateLimitResult> {
  return checkLimit(userId, modelTier)
}

export async function incrementModelUsage(userId: string, modelTier: 'model1' | 'model2'): Promise<void> {
  return incrementUsage(userId, modelTier)
}

export async function checkChatLimit(userId: string): Promise<RateLimitResult> {
  return checkLimit(userId, 'chat')
}

export async function incrementChatUsage(userId: string): Promise<void> {
  return incrementUsage(userId, 'chat')
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult & { quota: number }> {
  const result = await checkLimit(userId, 'model1')
  return { ...result, quota: result.dailyLimit }
}
