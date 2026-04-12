export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Core profile via typed Prisma client
  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, language: true,
      birthDate: true, birthTime: true, birthPlace: true, gender: true,
      role: true, createdAt: true, consentAt: true, consentVersion: true,
    },
  })

  if (!userProfile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Phase 6 columns via raw SQL (generated client may not have them yet)
  const masterMemoryFlags = await prisma.$queryRawUnsafe<
    Array<{ portraitEnabled: boolean; masterMemoryDisclosureSeenAt: Date | null }>
  >(
    `SELECT "portraitEnabled", "masterMemoryDisclosureSeenAt" FROM "User" WHERE "id" = $1`,
    userId,
  ).then((rows) => rows[0] ?? { portraitEnabled: true, masterMemoryDisclosureSeenAt: null })

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

  // ─── Phase 6: master memory tables in the GDPR export ─────────────────
  // Loaded via raw SQL because the dev-server lock can prevent
  // `prisma generate` from picking up the new model types in dev. The
  // store wrappers handle the same query in production.
  const [masterChatMessages, userPortrait, userPortraitHistory] = await Promise.all([
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "id", "sessionId", "turnIndex", "role", "content",
              "toolCallsJson", "tokenCount", "archivedAt", "createdAt"
       FROM "MasterChatMessage" WHERE "userId" = $1
       ORDER BY "createdAt" ASC`,
      userId,
    ),
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "version", "topics", "preferences", "lifeContext", "toneNotes",
              "generatedPrompt", "lastExtractedAt", "lastTurnIndexCovered",
              "lastManualEditAt", "createdAt", "updatedAt"
       FROM "UserPortrait" WHERE "userId" = $1`,
      userId,
    ),
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "id", "version", "topics", "preferences", "lifeContext",
              "toneNotes", "trigger", "createdAt"
       FROM "UserPortraitHistory" WHERE "userId" = $1
       ORDER BY "version" ASC`,
      userId,
    ),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: { ...userProfile, ...masterMemoryFlags },
    readings,
    familyMembers,
    rateLimits,
    shareLinks,
    authLogs,
    siteFeedback,
    // Phase 6: master memory data included for GDPR data portability
    masterMemory: {
      chatMessages: masterChatMessages,
      portrait: userPortrait[0] ?? null,
      portraitHistory: userPortraitHistory,
    },
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="xuanji-data-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
