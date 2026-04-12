/**
 * GET /api/admin/master-debug/[userId]
 *
 * Returns a structured debug payload for one user's master memory state.
 * Admin-only. Every call writes a `view_master_debug` row to AdminAccessLog.
 *
 * Sections (matches §10.5 of docs/master-portrait-system-plan.md):
 *   A. Identity + flags
 *   B. Current portrait
 *   C. Portrait history (last 20)
 *   D. Chat stats + recent messages
 *   E. Live preview — compressed history + composed system prompt
 *   F. LLM logs (last 20 master-endpoint calls)
 *   G. (UI-only — admin actions are separate endpoints)
 *   H. Access log for this target user (last 20)
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import {
  loadMasterChatMessages,
  getActiveSessionId,
} from '@/lib/master/chatMessageStore'
import {
  loadPortrait,
  loadPortraitHistory,
} from '@/lib/master/portraitStore'
import { compressHistory } from '@/lib/master/compression'
import { renderPersonalizedPrompt } from '@/lib/master/personalizedPrompt'
import { buildMasterSystemPrompt } from '@/lib/master'
import {
  logAdminAccess,
  loadAdminAccessLogForTarget,
} from '@/lib/master/adminAccessLog'
import { resolveLLMConfig } from '@/lib/llm'

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { error, user } = await requireAdmin()
  if (error) return error
  const { userId: targetUserId } = await params
  const adminUserId = user!.id

  // ─── A. Identity + flags ─────────────────────────────────────────────
  // Core fields via typed Prisma client, new columns via raw SQL
  const coreUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true, email: true, name: true, language: true,
      createdAt: true, credits: true, usageMaster: true,
    },
  })
  if (!coreUser) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
  }
  const extraFlags = await prisma.$queryRawUnsafe<
    Array<{ portraitEnabled: boolean; masterMemoryDisclosureSeenAt: Date | null }>
  >(
    `SELECT "portraitEnabled", "masterMemoryDisclosureSeenAt" FROM "User" WHERE "id" = $1`,
    targetUserId,
  ).then((rows) => rows[0] ?? { portraitEnabled: true, masterMemoryDisclosureSeenAt: null })
  const targetUser = { ...coreUser, ...extraFlags }

  // Log the access (best-effort, non-blocking)
  await logAdminAccess({
    adminUserId,
    targetUserId,
    action: 'view_master_debug',
  })

  // ─── B + C. Portrait + history ───────────────────────────────────────
  const [portrait, portraitHistory] = await Promise.all([
    loadPortrait(targetUserId),
    loadPortraitHistory(targetUserId, 20),
  ])

  // ─── D. Chat stats + recent messages ─────────────────────────────────
  const sessionId = await getActiveSessionId(targetUserId)
  const allRowsRaw = await prisma.$queryRawUnsafe<Array<{
    id: string
    sessionId: string
    turnIndex: number
    role: string
    content: string | null
    toolCallsJson: string | null
    tokenCount: number | null
    archivedAt: Date | null
    createdAt: Date
  }>>(
    `SELECT "id", "sessionId", "turnIndex", "role", "content",
            "toolCallsJson", "tokenCount", "archivedAt", "createdAt"
     FROM "MasterChatMessage" WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 50`,
    targetUserId,
  )

  // Aggregate stats via raw SQL for accurate counts (recent 50 above is for display)
  const statsRows = await prisma.$queryRawUnsafe<Array<{
    total_count: bigint
    user_count: bigint
    assistant_count: bigint
    archived_count: bigint
    total_tokens: bigint
    earliest: Date | null
    latest: Date | null
    distinct_sessions: bigint
  }>>(
    `SELECT
       COUNT(*)::bigint as total_count,
       COUNT(*) FILTER (WHERE "role" = 'user')::bigint as user_count,
       COUNT(*) FILTER (WHERE "role" = 'assistant')::bigint as assistant_count,
       COUNT(*) FILTER (WHERE "archivedAt" IS NOT NULL)::bigint as archived_count,
       COALESCE(SUM("tokenCount"), 0)::bigint as total_tokens,
       MIN("createdAt") as earliest,
       MAX("createdAt") as latest,
       COUNT(DISTINCT "sessionId")::bigint as distinct_sessions
     FROM "MasterChatMessage" WHERE "userId" = $1`,
    targetUserId,
  )
  const zero = BigInt(0)
  const stats = statsRows[0] ?? {
    total_count: zero,
    user_count: zero,
    assistant_count: zero,
    archived_count: zero,
    total_tokens: zero,
    earliest: null,
    latest: null,
    distinct_sessions: zero,
  }

  // ─── E. Live preview — compressed history + system prompt ────────────
  let compressedPreview: { messages: Array<{ role: string; content: string | null }>; summarized: boolean; estimatedTokens: number } = {
    messages: [],
    summarized: false,
    estimatedTokens: 0,
  }
  let systemPromptPreview = ''
  try {
    const lang = targetUser.language === 'en' ? 'en' : 'zh-TW'
    const personalizedPrompt = portrait
      ? portrait.generatedPrompt ??
        renderPersonalizedPrompt(
          {
            topics: portrait.topics,
            preferences: portrait.preferences,
            lifeContext: portrait.lifeContext,
            toneNotes: portrait.toneNotes,
          },
          lang,
        )
      : null
    systemPromptPreview = buildMasterSystemPrompt({
      lang,
      currentDateTime: new Date().toISOString(),
      personalizedPrompt,
    })

    if (sessionId) {
      const activeRows = await loadMasterChatMessages(targetUserId, sessionId)
      const { model } = await resolveLLMConfig({ endpoint: 'master' })
      // Pass-through compression (no LLM call as long as under budget) so the
      // admin sees exactly what the next master turn would receive.
      const result = await compressHistory(activeRows, {
        userId: targetUserId,
        systemPrompt: systemPromptPreview,
        model,
      })
      compressedPreview = {
        messages: result.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : null,
        })),
        summarized: result.summarized,
        estimatedTokens: result.estimatedTokens,
      }
    }
  } catch (e) {
    console.error('[admin/master-debug] preview failed:', e)
  }

  // ─── F. LLM logs (last 20 master endpoint calls) ─────────────────────
  const llmLogs = await prisma.llmLog.findMany({
    where: { userId: targetUserId, endpoint: 'master' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      model: true,
      status: true,
      errorMessage: true,
      latencyMs: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      inputPreview: true,
      outputPreview: true,
      createdAt: true,
    },
  })

  // ─── H. Admin access log for this target ─────────────────────────────
  const accessLog = await loadAdminAccessLogForTarget(targetUserId, 20)

  return NextResponse.json({
    target: {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      language: targetUser.language,
      createdAt: targetUser.createdAt,
      credits: targetUser.credits,
      usageMaster: targetUser.usageMaster,
      portraitEnabled: targetUser.portraitEnabled,
      masterMemoryDisclosureSeenAt: targetUser.masterMemoryDisclosureSeenAt,
    },
    portrait: portrait
      ? {
          version: portrait.version,
          topics: portrait.topics,
          preferences: portrait.preferences,
          lifeContext: portrait.lifeContext,
          toneNotes: portrait.toneNotes,
          generatedPrompt: portrait.generatedPrompt,
          lastExtractedAt: portrait.lastExtractedAt,
          lastTurnIndexCovered: portrait.lastTurnIndexCovered,
          lastManualEditAt: portrait.lastManualEditAt,
          createdAt: portrait.createdAt,
          updatedAt: portrait.updatedAt,
        }
      : null,
    portraitHistory: portraitHistory.map((h) => ({
      id: h.id,
      version: h.version,
      topics: h.topics,
      preferences: h.preferences,
      lifeContext: h.lifeContext,
      toneNotes: h.toneNotes,
      trigger: h.trigger,
      createdAt: h.createdAt,
    })),
    chat: {
      activeSessionId: sessionId,
      stats: {
        total: Number(stats.total_count),
        userMessages: Number(stats.user_count),
        assistantMessages: Number(stats.assistant_count),
        archived: Number(stats.archived_count),
        totalEstimatedTokens: Number(stats.total_tokens),
        earliest: stats.earliest,
        latest: stats.latest,
        distinctSessions: Number(stats.distinct_sessions),
      },
      recentMessages: allRowsRaw,
    },
    livePreview: {
      systemPrompt: systemPromptPreview,
      systemPromptLength: systemPromptPreview.length,
      compressedHistory: compressedPreview,
    },
    llmLogs,
    accessLog,
  })
}
