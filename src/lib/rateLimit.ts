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

export async function grantDailyBonus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, lastDailyBonus: true },
  })
  if (!user) return false
  if (user.isAdmin) return false

  const now = new Date()
  if (user.lastDailyBonus && isSameDay(user.lastDailyBonus, now)) {
    return false // already granted today
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      divinationCredits: { increment: 1 },
      chatCredits: { increment: 1 },
      lastDailyBonus: now,
    },
  })
  return true
}
