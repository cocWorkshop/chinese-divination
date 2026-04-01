import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getStage(readingCount: number): string {
  if (readingCount === 0) return 'new'
  if (readingCount <= 3) return 'beginner'
  if (readingCount <= 10) return 'intermediate'
  return 'advanced'
}

export async function GET() {
  try {
    const session = await auth()
    let readingCount = 0

    if (session?.user?.id) {
      readingCount = await prisma.reading.count({
        where: { userId: session.user.id, deletedAt: null, status: 'completed' },
      })
    }

    const stage = getStage(readingCount)
    const now = new Date()
    const day = now.getDay()
    const isWeekend = day === 0 || day === 6

    // Find all enabled rules, ordered by priority desc
    const rules = await prisma.welcomeRule.findMany({
      where: { enabled: true },
      orderBy: { priority: 'desc' },
    })

    // Find best matching rule
    let bestRule = null
    for (const rule of rules) {
      const cond = rule.condition as { stage?: string; isWeekend?: boolean }
      // Weekend rules only match on weekends
      if (cond.isWeekend === true && !isWeekend) continue
      // Stage match: 'any' matches all, or exact match
      if (cond.stage && cond.stage !== 'any' && cond.stage !== stage) continue
      bestRule = rule
      break
    }

    if (!bestRule) {
      return NextResponse.json({ message: null, recommendType: null })
    }

    const msgs = bestRule.messages as { zh: string[]; en: string[] }
    const zhMessages = msgs.zh || []
    const enMessages = msgs.en || []
    const zhMsg = zhMessages[Math.floor(Math.random() * zhMessages.length)] || ''
    const enMsg = enMessages[Math.floor(Math.random() * enMessages.length)] || ''

    // For advanced users with no specific recommendType, pick random
    let recommendType = bestRule.recommendType
    if (!recommendType) {
      const types = ['bazi', 'ziwei', 'liuyao', 'qimen', 'meihua', 'fengshui']
      recommendType = types[Math.floor(Math.random() * types.length)]
    }

    return NextResponse.json({
      message: { zh: zhMsg, en: enMsg },
      recommendType,
      stage,
    })
  } catch (e) {
    console.error('Welcome API error:', e)
    return NextResponse.json({ message: null, recommendType: null })
  }
}
