export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, language: true,
      birthDate: true, birthTime: true, birthPlace: true, gender: true,
      role: true, createdAt: true, consentAt: true, consentVersion: true,
    },
  })

  if (!userProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [readings, familyMembers, rateLimits, shareLinks, authLogs, siteFeedback] = await Promise.all([
    prisma.reading.findMany({
      where: { userId },
      select: {
        id: true, type: true, question: true, inputData: true, result: true,
        language: true, targetType: true, rating: true, createdAt: true,
      },
    }),
    prisma.familyMember.findMany({
      where: { userId },
      select: {
        id: true, relation: true, name: true, birthDate: true,
        birthTime: true, birthPlace: true, gender: true, createdAt: true,
      },
    }),
    prisma.rateLimit.findMany({
      where: { userId },
      select: { windowStart: true, count: true, modelTier: true },
    }),
    prisma.shareLink.findMany({
      where: { userId },
      select: { code: true, used: true, usedAt: true, createdAt: true },
    }),
    prisma.authLog.findMany({
      where: { email: userProfile.email },
      select: { action: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.siteFeedback.findMany({
      where: { userId },
      select: { rating: true, feedback: true, createdAt: true },
    }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: userProfile,
    readings,
    familyMembers,
    rateLimits,
    shareLinks,
    authLogs,
    siteFeedback,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="xuanji-data-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
