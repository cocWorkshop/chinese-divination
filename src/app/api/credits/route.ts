import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkLimit } from '@/lib/rateLimit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const [model1, model2, chat, timeoutSetting, user] = await Promise.all([
    checkLimit(session.user.id, 'model1'),
    checkLimit(session.user.id, 'model2'),
    checkLimit(session.user.id, 'chat'),
    prisma.adminSetting.findUnique({ where: { key: 'llmTimeoutSeconds' } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { bonusModel1: true, bonusModel2: true, bonusChat: true } }),
  ])

  const llmTimeoutSeconds = parseInt(timeoutSetting?.value || '240', 10) || 240

  return NextResponse.json({
    model1: { remaining: model1.remaining, used: model1.used, dailyLimit: model1.dailyLimit, bonus: model1.bonus },
    model2: { remaining: model2.remaining, used: model2.used, dailyLimit: model2.dailyLimit, bonus: model2.bonus },
    chat: { remaining: chat.remaining, used: chat.used, dailyLimit: chat.dailyLimit, bonus: chat.bonus },
    bonusModel1: user?.bonusModel1 || 0,
    bonusModel2: user?.bonusModel2 || 0,
    bonusChat: user?.bonusChat || 0,
    llmTimeoutSeconds,
  })
}
