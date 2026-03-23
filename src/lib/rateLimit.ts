import { prisma } from './prisma'

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getUTCFullYear() === d2.getUTCFullYear()
    && d1.getUTCMonth() === d2.getUTCMonth()
    && d1.getUTCDate() === d2.getUTCDate()
}

export async function checkDivinationCredits(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, divinationCredits: true },
  })
  if (!user) return { allowed: false, remaining: 0 }
  if (user.isAdmin) return { allowed: true, remaining: 999 }
  return { allowed: user.divinationCredits > 0, remaining: user.divinationCredits }
}

export async function deductDivinationCredit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })
  if (user?.isAdmin) return
  await prisma.user.update({
    where: { id: userId },
    data: { divinationCredits: { decrement: 1 } },
  })
}

export async function checkChatCredits(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, chatCredits: true },
  })
  if (!user) return { allowed: false, remaining: 0 }
  if (user.isAdmin) return { allowed: true, remaining: 999 }
  return { allowed: user.chatCredits > 0, remaining: user.chatCredits }
}

export async function deductChatCredit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })
  if (user?.isAdmin) return
  await prisma.user.update({
    where: { id: userId },
    data: { chatCredits: { decrement: 1 } },
  })
}

export async function grantDailyBonus(userId: string): Promise<{ granted: boolean; divination: number; chat: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, lastDailyBonus: true },
  })
  if (!user) return { granted: false, divination: 0, chat: 0 }
  if (user.isAdmin) return { granted: false, divination: 0, chat: 0 }

  const now = new Date()
  if (user.lastDailyBonus && isSameDay(user.lastDailyBonus, now)) {
    return { granted: false, divination: 0, chat: 0 }
  }

  const [divSetting, chatSetting] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: 'dailyBonusDivination' } }),
    prisma.adminSetting.findUnique({ where: { key: 'dailyBonusChat' } }),
  ])
  const divBonus = parseInt(divSetting?.value ?? '1', 10) || 1
  const chatBonus = parseInt(chatSetting?.value ?? '1', 10) || 1

  await prisma.user.update({
    where: { id: userId },
    data: {
      divinationCredits: { increment: divBonus },
      chatCredits: { increment: chatBonus },
      lastDailyBonus: now,
    },
  })
  return { granted: true, divination: divBonus, chat: chatBonus }
}
