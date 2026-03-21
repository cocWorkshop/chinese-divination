export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const search = searchParams.get('search') || ''

  const where = search
    ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, name: true, isAdmin: true, isPaid: true, role: true,
        hourlyQuota: true, bonusModel1: true, bonusModel2: true, bonusChat: true,
        createdAt: true, language: true,
        _count: { select: { readings: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Get today's usage for each user (both model tiers)
  const now = new Date()
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const rateLimits = await prisma.rateLimit.findMany({
    where: { userId: { in: users.map(u => u.id) }, windowStart },
    select: { userId: true, count: true, modelTier: true },
  })

  const usageMap: Record<string, { model1: number; model2: number; chat: number }> = {}
  for (const r of rateLimits) {
    if (!usageMap[r.userId]) usageMap[r.userId] = { model1: 0, model2: 0, chat: 0 }
    if (r.modelTier === 'model2') usageMap[r.userId].model2 = r.count
    else if (r.modelTier === 'model1') usageMap[r.userId].model1 = r.count
    else if (r.modelTier === 'chat') usageMap[r.userId].chat = r.count
  }

  // Fetch role-based daily limits
  const roles = ['arcane', 'ethereal', 'prestige']
  const resources = ['model1', 'model2', 'chat']
  const settingKeys = roles.flatMap(r => resources.map(res => `${r}_daily_${res}`))
  const settings = await prisma.adminSetting.findMany({ where: { key: { in: settingKeys } } })
  const settingsMap: Record<string, number> = {}
  for (const s of settings) settingsMap[s.key] = parseInt(s.value)

  const defaults: Record<string, { m1: number; m2: number; chat: number }> = {
    arcane:   { m1: 20, m2: 2,  chat: 3  },
    ethereal: { m1: -1, m2: 20, chat: 10 },
    prestige: { m1: -1, m2: -1, chat: -1 },
    admin:    { m1: -1, m2: -1, chat: -1 },
  }
  const getLimits = (role: string) => ({
    m1: settingsMap[`${role}_daily_model1`] ?? defaults[role]?.m1 ?? 20,
    m2: settingsMap[`${role}_daily_model2`] ?? defaults[role]?.m2 ?? 2,
    chat: settingsMap[`${role}_daily_chat`] ?? defaults[role]?.chat ?? 3,
  })

  return NextResponse.json({
    users: users.map(u => {
      const role = u.isAdmin ? 'admin' : (u.role || 'arcane')
      const roleLimits = getLimits(role)
      return {
        ...u,
        usedTodayModel1: usageMap[u.id]?.model1 ?? 0,
        usedTodayModel2: usageMap[u.id]?.model2 ?? 0,
        usedTodayChat: usageMap[u.id]?.chat ?? 0,
        limitModel1: roleLimits.m1,
        limitModel2: roleLimits.m2,
        limitChat: roleLimits.chat,
      }
    }),
    total,
    pages: Math.ceil(total / limit),
    page,
  })
}
