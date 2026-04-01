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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface WelcomeItem {
  zh: string
  en: string
  recommendType: string | null
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

    // Collect ALL matching rules
    const matchingRules = []
    for (const rule of rules) {
      const cond = rule.condition as { stage?: string; isWeekend?: boolean; timeOfDay?: string }
      if (cond.isWeekend === true && !isWeekend) continue
      if (cond.timeOfDay && cond.timeOfDay !== timeOfDay) continue
      if (cond.stage && cond.stage !== 'any' && cond.stage !== stage) continue
      matchingRules.push(rule)
    }

    if (matchingRules.length === 0) {
      return NextResponse.json({ message: null, recommendType: null, messages: [] })
    }

    // Build a pool of welcome items from all matching rules
    const items: WelcomeItem[] = []
    for (const rule of matchingRules) {
      const msgs = rule.messages as { zh: string[]; en: string[] }
      const zhArr = msgs.zh || []
      const enArr = msgs.en || []
      const count = Math.min(zhArr.length, enArr.length)
      for (let i = 0; i < count; i++) {
        items.push({ zh: zhArr[i], en: enArr[i], recommendType: rule.recommendType })
      }
    }

    // Shuffle and pick at least 3 (up to 5) diverse items
    const shuffled = shuffle(items)
    // Try to ensure diversity: pick from different recommendTypes first
    const seen = new Set<string>()
    const diverse: WelcomeItem[] = []
    const rest: WelcomeItem[] = []
    for (const item of shuffled) {
      const key = item.recommendType || 'none'
      if (!seen.has(key) && diverse.length < 5) {
        seen.add(key)
        diverse.push(item)
      } else {
        rest.push(item)
      }
    }
    // Fill up to at least 3
    while (diverse.length < 3 && rest.length > 0) {
      diverse.push(rest.shift()!)
    }
    const finalItems = shuffle(diverse.slice(0, 5))

    // Legacy single message (first item)
    const first = finalItems[0]

    return NextResponse.json({
      message: first ? { zh: first.zh, en: first.en } : null,
      recommendType: first?.recommendType || null,
      stage,
      messages: finalItems,
    })
  } catch (e) {
    console.error('Welcome API error:', e)
    return NextResponse.json({ message: null, recommendType: null, messages: [] })
  }
}
