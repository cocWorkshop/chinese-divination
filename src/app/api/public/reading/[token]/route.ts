export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

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

  return NextResponse.json({
    type: reading.type,
    result: reading.result,
    language: reading.language,
    createdAt: reading.createdAt,
    question: reading.question,
    inputData: reading.inputData,
    subjectName,
    birthInfo: Object.keys(birthInfo).length > 0 ? birthInfo : null,
    targetType: reading.targetType,
  })
}
