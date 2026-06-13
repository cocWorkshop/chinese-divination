export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import {
  getHandlerByType,
  validateHandlerOutput,
} from '@/app/api/divination/handlers'

/**
 * Match window for LlmLog → Reading correlation. Generation can take 60-90s
 * for V2 bazi/ziwei, so a tight window misses the matching log; 5 minutes
 * is generous enough to catch slow runs without grabbing unrelated calls
 * unless the user is firing readings back-to-back.
 */
const LLM_LOG_MATCH_WINDOW_MS = 5 * 60 * 1000

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const reading = await prisma.reading.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      familyMember: { select: { name: true, relation: true } },
      feedbacks: { select: { rating: true, feedback: true, createdAt: true } },
    },
  })

  if (!reading) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // ─── LLM logs correlated by userId + time window ──────────────────────
  // Not joined by FK (LlmLog doesn't reference Reading), so we approximate
  // using `endpoint='divination'` and a ±5min window around the reading's
  // createdAt. Sorted by |Δt| ascending so the closest match is first.
  const windowStart = new Date(reading.createdAt.getTime() - LLM_LOG_MATCH_WINDOW_MS)
  const windowEnd = new Date(reading.createdAt.getTime() + LLM_LOG_MATCH_WINDOW_MS)
  const rawLogs = await prisma.llmLog.findMany({
    where: {
      userId: reading.userId,
      endpoint: 'divination',
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      model: true,
      modelTier: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
      latencyMs: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
    take: 10,
  })
  const llmLogs = rawLogs
    .map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
      offsetMs: log.createdAt.getTime() - reading.createdAt.getTime(),
    }))
    .sort((a, b) => Math.abs(a.offsetMs) - Math.abs(b.offsetMs))

  // ─── Schema validation against the type's Zod schema ─────────────────
  // Validates `reading.result` (the merged + persisted output) against
  // `handler.schema.passthrough()`. Reports pass/fail + issue list (path +
  // message) so admins can spot LLM output gaps. Validates against the
  // PRIMARY schema for the type; if a reading was generated via the
  // fallback path (e.g. bazi without birthTime), validation will surface
  // the missing fields as issues — still useful debug signal.
  const handler = getHandlerByType(reading.type)
  let validation: {
    parseable: boolean
    schemaName: string
    ok: boolean
    issues: { path: string; message: string; code: string }[]
    parseError?: string
  } = {
    parseable: false,
    schemaName: handler.chartKey ?? reading.type,
    ok: false,
    issues: [],
  }
  try {
    const parsed = JSON.parse(reading.result)
    const result = validateHandlerOutput(handler, parsed)
    if (result.success) {
      validation = {
        parseable: true,
        schemaName: handler.chartKey ?? reading.type,
        ok: true,
        issues: [],
      }
    } else {
      validation = {
        parseable: true,
        schemaName: handler.chartKey ?? reading.type,
        ok: false,
        issues: result.issues.map((i) => ({
          path: i.path.length > 0 ? i.path.join('.') : '(root)',
          message: i.message,
          code: i.code,
        })),
      }
    }
  } catch (e) {
    validation = {
      parseable: false,
      schemaName: handler.chartKey ?? reading.type,
      ok: false,
      issues: [],
      parseError: e instanceof Error ? e.message : String(e),
    }
  }

  return NextResponse.json({ reading, llmLogs, validation })
}
