/**
 * MasterChatMessage store — typed wrapper around the MasterChatMessage table.
 *
 * Canonical source of master chat history: one row per turn, enabling
 * token-budget compression as queries instead of array slicing, and
 * per-session archival for the "New chat" soft-reset flow.
 *
 * Errors are caught and logged but never thrown — a failed write must NOT
 * break the user-facing chat flow.
 */

import { prisma } from '../prisma'
import { randomUUID } from 'node:crypto'

export type MasterChatRole = 'user' | 'assistant' | 'system' | 'tool'

export interface MasterChatMessageInput {
  userId: string
  sessionId: string
  role: MasterChatRole
  content?: string | null
  toolCallsJson?: string | null
  toolCallId?: string | null
  tokenCount?: number | null
}

export interface MasterChatMessageRow {
  id: string
  userId: string
  sessionId: string
  turnIndex: number
  role: MasterChatRole
  content: string | null
  toolCallsJson: string | null
  toolCallId: string | null
  tokenCount: number | null
  archivedAt: Date | null
  createdAt: Date
}

/**
 * Best-effort INSERT — never throws. Returns the inserted row id, or null
 * if the write failed (caller continues regardless). The `mcm_` id prefix is
 * preserved (vs. cuid default in schema.prisma) for backward compatibility
 * with existing rows.
 */
export async function appendMasterChatMessage(
  input: MasterChatMessageInput,
): Promise<string | null> {
  try {
    const turnIndex = await nextTurnIndex(input.userId, input.sessionId)
    const id = `mcm_${randomUUID().replace(/-/g, '').slice(0, 20)}`
    await prisma.masterChatMessage.create({
      data: {
        id,
        userId: input.userId,
        sessionId: input.sessionId,
        turnIndex,
        role: input.role,
        content: input.content ?? null,
        toolCallsJson: input.toolCallsJson ?? null,
        toolCallId: input.toolCallId ?? null,
        tokenCount: input.tokenCount ?? null,
      },
    })
    return id
  } catch (err) {
    console.error('[chatMessageStore] appendMasterChatMessage failed:', err)
    return null
  }
}

/**
 * Returns the next monotonic turnIndex for a (userId, sessionId).
 * Fresh sessions start at 0. If the query fails, returns 0 (best-effort).
 */
export async function nextTurnIndex(
  userId: string,
  sessionId: string,
): Promise<number> {
  try {
    const agg = await prisma.masterChatMessage.aggregate({
      where: { userId, sessionId },
      _max: { turnIndex: true },
    })
    const max = agg._max.turnIndex
    return max == null ? 0 : max + 1
  } catch (err) {
    console.error('[chatMessageStore] nextTurnIndex failed:', err)
    return 0
  }
}

/**
 * Load all non-archived messages for a session, ordered by turnIndex.
 * Returns an empty array on error.
 */
export async function loadMasterChatMessages(
  userId: string,
  sessionId: string,
  options: { includeArchived?: boolean } = {},
): Promise<MasterChatMessageRow[]> {
  try {
    const rows = await prisma.masterChatMessage.findMany({
      where: {
        userId,
        sessionId,
        ...(options.includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: { turnIndex: 'asc' },
    })
    return rows as MasterChatMessageRow[]
  } catch (err) {
    console.error('[chatMessageStore] loadMasterChatMessages failed:', err)
    return []
  }
}

/**
 * Count non-archived messages for a (userId, sessionId). Used by the
 * greeting state-detection logic — if count is 0, the widget renders the
 * fresh-session greeting.
 */
export async function countMasterChatMessages(
  userId: string,
  sessionId: string,
): Promise<number> {
  try {
    return await prisma.masterChatMessage.count({
      where: { userId, sessionId, archivedAt: null },
    })
  } catch (err) {
    console.error('[chatMessageStore] countMasterChatMessages failed:', err)
    return 0
  }
}

/**
 * Archive (soft-delete) all messages in a session by setting archivedAt = NOW.
 * Used by the "Start new session" soft-reset endpoint.
 */
export async function archiveSession(
  userId: string,
  sessionId: string,
): Promise<number> {
  try {
    const result = await prisma.masterChatMessage.updateMany({
      where: { userId, sessionId, archivedAt: null },
      data: { archivedAt: new Date() },
    })
    return result.count
  } catch (err) {
    console.error('[chatMessageStore] archiveSession failed:', err)
    return 0
  }
}

/**
 * Hard-delete all rows for a user. Used by DELETE /api/master ("forget
 * everything") and the GDPR account-deletion endpoint.
 */
export async function deleteAllMasterChatMessages(userId: string): Promise<number> {
  try {
    const result = await prisma.masterChatMessage.deleteMany({
      where: { userId },
    })
    return result.count
  } catch (err) {
    console.error('[chatMessageStore] deleteAllMasterChatMessages failed:', err)
    return 0
  }
}

// ─── Session id management ──────────────────────────────────────────────

/**
 * Returns the sessionId of the user's currently-active master chat session
 * (the latest non-archived row's sessionId), or null if there are no active
 * rows. Null means either: (a) brand-new user, or (b) the user just
 * soft-reset via "Start new session". In both cases the caller should
 * generate a fresh sessionId via generateSessionId().
 */
export async function getActiveSessionId(userId: string): Promise<string | null> {
  try {
    const row = await prisma.masterChatMessage.findFirst({
      where: { userId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { sessionId: true },
    })
    return row?.sessionId ?? null
  } catch (err) {
    console.error('[chatMessageStore] getActiveSessionId failed:', err)
    return null
  }
}

/** Stable prefix + 20-char random suffix. */
export function generateSessionId(): string {
  return `mses_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

/**
 * Archive (soft-delete) ALL non-archived messages for a user, regardless
 * of sessionId. Used by POST /api/master/new-session — the user keeps
 * their portrait and chart data but the working chat history is reset.
 */
export async function archiveAllUserMessages(userId: string): Promise<number> {
  try {
    const result = await prisma.masterChatMessage.updateMany({
      where: { userId, archivedAt: null },
      data: { archivedAt: new Date() },
    })
    return result.count
  } catch (err) {
    console.error('[chatMessageStore] archiveAllUserMessages failed:', err)
    return 0
  }
}

/**
 * Pure helper — true if `lastActivity` is older than `staleHours` from `now`.
 * Extracted so the time-comparison logic is unit-testable without a DB.
 *
 * `staleHours <= 0` disables the check (returns false). Use this to opt out
 * via env var without conditional call sites.
 */
export function isSessionStale(
  lastActivity: Date,
  now: Date,
  staleHours: number,
): boolean {
  if (!Number.isFinite(staleHours) || staleHours <= 0) return false
  const ageMs = now.getTime() - lastActivity.getTime()
  return ageMs > staleHours * 60 * 60 * 1000
}

/**
 * Silently archive the user's active session if its most recent turn is older
 * than `staleHours`. Returns true iff something was archived (caller may use
 * this for logging; the user-facing flow is unchanged either way — the next
 * read returns empty messages and the widget renders its fresh-session
 * greeting). Best-effort: never throws.
 */
export async function archiveStaleActiveSession(
  userId: string,
  staleHours: number,
): Promise<boolean> {
  if (!Number.isFinite(staleHours) || staleHours <= 0) return false
  try {
    const agg = await prisma.masterChatMessage.aggregate({
      where: { userId, archivedAt: null },
      _max: { createdAt: true },
    })
    const lastActivity = agg._max.createdAt
    if (!lastActivity) return false
    if (!isSessionStale(lastActivity, new Date(), staleHours)) return false

    const archived = await archiveAllUserMessages(userId)
    if (archived > 0) {
      console.log(
        `[chatMessageStore] archived stale session for user=${userId} ` +
          `(${archived} rows, lastActivity=${lastActivity.toISOString()})`,
      )
    }
    return archived > 0
  } catch (err) {
    console.error('[chatMessageStore] archiveStaleActiveSession failed:', err)
    return false
  }
}

/**
 * Cheap token estimate — chars / 4. Conservative; close enough for
 * compression-trigger decisions without bringing in a real tokenizer.
 */
export function estimateTokens(text: string | null | undefined): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

// ─── Session listing / deletion (used by /profile/portrait) ─────────────

export interface SessionSummary {
  sessionId: string
  startedAt: Date
  endedAt: Date
  totalTurns: number
  userTurns: number
  isActive: boolean
  firstUserMessage: string | null
}

/**
 * List all chat sessions for a user with per-session metadata. Ordered
 * newest (most recent activity) first. Includes both active and archived
 * sessions — a session is "active" when at least one row is not archived.
 *
 * Built from four typed queries (vs. one CTE in the previous raw-SQL version)
 * because Prisma's groupBy can't express conditional aggregates
 * (`COUNT(*) FILTER (WHERE …)`). The four queries are merged in JS. The page
 * that consumes this is /profile/portrait — not on a hot path, so the cost
 * is acceptable.
 */
export async function listUserSessions(userId: string): Promise<SessionSummary[]> {
  try {
    const [totals, userOnly, activeOnly, firsts] = await Promise.all([
      // Per-session totals + window (one row per session).
      prisma.masterChatMessage.groupBy({
        by: ['sessionId'],
        where: { userId },
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      // User-only counts.
      prisma.masterChatMessage.groupBy({
        by: ['sessionId'],
        where: { userId, role: 'user' },
        _count: { _all: true },
      }),
      // Non-archived counts (active iff > 0).
      prisma.masterChatMessage.groupBy({
        by: ['sessionId'],
        where: { userId, archivedAt: null },
        _count: { _all: true },
      }),
      // First user message per session (one row per sessionId via distinct).
      prisma.masterChatMessage.findMany({
        where: { userId, role: 'user' },
        orderBy: [{ sessionId: 'asc' }, { turnIndex: 'asc' }],
        distinct: ['sessionId'],
        select: { sessionId: true, content: true },
      }),
    ])

    const userTurnsBySession = new Map(
      userOnly.map((r) => [r.sessionId, r._count._all]),
    )
    const activeCountBySession = new Map(
      activeOnly.map((r) => [r.sessionId, r._count._all]),
    )
    const firstUserMessageBySession = new Map(
      firsts.map((r) => [r.sessionId, r.content]),
    )

    return totals
      .map((t) => ({
        sessionId: t.sessionId,
        startedAt: t._min.createdAt ?? new Date(0),
        endedAt: t._max.createdAt ?? new Date(0),
        totalTurns: t._count._all,
        userTurns: userTurnsBySession.get(t.sessionId) ?? 0,
        isActive: (activeCountBySession.get(t.sessionId) ?? 0) > 0,
        firstUserMessage: firstUserMessageBySession.get(t.sessionId) ?? null,
      }))
      .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())
  } catch (err) {
    console.error('[chatMessageStore] listUserSessions failed:', err)
    return []
  }
}

/**
 * Hard-delete every row for a (userId, sessionId). Returns rows affected.
 * Used by the "Delete session" action on /profile/portrait.
 */
export async function deleteSession(userId: string, sessionId: string): Promise<number> {
  try {
    const result = await prisma.masterChatMessage.deleteMany({
      where: { userId, sessionId },
    })
    return result.count
  } catch (err) {
    console.error('[chatMessageStore] deleteSession failed:', err)
    return 0
  }
}
