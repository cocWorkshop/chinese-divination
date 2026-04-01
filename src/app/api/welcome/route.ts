import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getStage(readingCount: number): string {
  if (readingCount === 0) return 'new'
  if (readingCount <= 3) return 'beginner'
  if (readingCount <= 10) return 'intermediate'
  return 'advanced'
}

function getTimeOfDay(hour: number): string {
  if (hour >= 21 || hour < 6) return 'evening'
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
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
    const timeOfDay = getTimeOfDay(now.getHours())

    // Find all enabled rules, ordered by priority desc
    const rules = await prisma.welcomeRule.findMany({
      where: { enabled: true },
      orderBy: { priority: 'desc' },
    })

    // Collect all matching rules, grouped by priority
    const matchingRules = []
    for (const rule of rules) {
      const cond = rule.condition as { stage?: string; isWeekend?: boolean; timeOfDay?: string }
      // Weekend rules only match on weekends
      if (cond.isWeekend === true && !isWeekend) continue
      // Time of day check
      if (cond.timeOfDay && cond.timeOfDay !== timeOfDay) continue
      // Stage match: 'any' matches all, or exact match
      if (cond.stage && cond.stage !== 'any' && cond.stage !== stage) continue
      matchingRules.push(rule)
    }

    if (matchingRules.length === 0) {
      return NextResponse.json({ message: null, recommendType: null })
    }

    // Pick from the highest priority group (there may be multiple rules with the same priority)
    const topPriority = matchingRules[0].priority
    const topRules = matchingRules.filter(r => r.priority === topPriority)
    
    // Random pick among same-priority rules (important for advanced users who have multiple recommendations)
    const bestRule = topRules[Math.floor(Math.random() * topRules.length)]

    const msgs = bestRule.messages as { zh: string[]; en: string[] }
    const zhMessages = msgs.zh || []
    const enMessages = msgs.en || []
    const zhIdx = Math.floor(Math.random() * zhMessages.length)
    const enIdx = Math.floor(Math.random() * enMessages.length)
    const zhMsg = zhMessages[zhIdx] || ''
    const enMsg = enMessages[enIdx] || ''

    return NextResponse.json({
      message: { zh: zhMsg, en: enMsg },
      recommendType: bestRule.recommendType,
      stage,
    })
  } catch (e) {
    console.error('Welcome API error:', e)
    return NextResponse.json({ message: null, recommendType: null })
  }
}
