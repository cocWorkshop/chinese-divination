export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimiter'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // ISS-07 / S1: Validate token format before hitting database
  if (!token || !/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  // Rate limiting by client IP (30 req / min)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous'
  if (!rateLimit(`public-reading:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const reading = await prisma.reading.findFirst({
    where: { shareToken: token, deletedAt: null },
    select: {
      type: true,
      result: true,
      language: true,
      createdAt: true,
      question: true,
      inputData: true,
      targetType: true,
      chatMessages: true,
      user: { select: { name: true } },
      familyMember: { select: { name: true, relation: true } },
    },
  })

  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Determine the subject name (who the reading is about)
  const inputData = reading.inputData as Record<string, unknown> || {}
  let subjectName: string | null = null
  if (reading.targetType === 'family' && reading.familyMember) {
    subjectName = reading.familyMember.name || reading.familyMember.relation || null
  } else {
    subjectName = reading.user?.name || null
  }

  // Extract birth info from inputData if applicable
  const birthInfo: Record<string, string | unknown> = {}
  if (inputData.birthDate) birthInfo.birthDate = inputData.birthDate
  if (inputData.birthTime) birthInfo.birthTime = inputData.birthTime
  if (inputData.gender) birthInfo.gender = inputData.gender
  if (inputData.lunarToggle) birthInfo.calendarType = inputData.lunarToggle

  // Parse chat messages, filter out errors/credit prompts
  let chatMessages: { role: string; content: string }[] = []
  if (reading.chatMessages) {
    try {
      chatMessages = JSON.parse(reading.chatMessages)
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    type: reading.type,
    result: reading.result,
    language: reading.language,
    createdAt: reading.createdAt,
    question: reading.question,
    // Raw inputData deliberately NOT returned — it carries full birth PII
    // (lat/lng, exact time, environment) beyond what the curated birthInfo
    // below already provides for display.
    subjectName,
    birthInfo: Object.keys(birthInfo).length > 0 ? birthInfo : null,
    targetType: reading.targetType,
    chatMessages: chatMessages.length > 0 ? chatMessages : undefined,
  })
}
