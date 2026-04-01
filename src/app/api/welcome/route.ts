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
      return NextResponse.json({ message: null, messages: [], recommendType: null })
    }

    // Collect messages from all matching rules (highest priority first)
    const allMessages: { zh: string; en: string; recommendType: string | null }[] = []
    for (const rule of matchingRules) {
      const msgs = rule.messages as { zh: string[]; en: string[] }
      const zhMessages = msgs.zh || []
      const enMessages = msgs.en || []
      const count = Math.max(zhMessages.length, enMessages.length)
      for (let i = 0; i < count; i++) {
        allMessages.push({
          zh: zhMessages[i % zhMessages.length] || '',
          en: enMessages[i % enMessages.length] || '',
          recommendType: rule.recommendType,
        })
      }
    }

    // Return first message for backward compatibility + all messages for carousel
    const first = allMessages[0]
    return NextResponse.json({
      message: { zh: first.zh, en: first.en },
      messages: allMessages,
      recommendType: first.recommendType,
      stage,
    })
  } catch (e) {
    console.error('Welcome API error:', e)
    return NextResponse.json({ message: null, recommendType: null })
  }
}
