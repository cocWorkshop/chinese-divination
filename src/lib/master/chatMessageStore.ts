/**
 * MasterChatMessage store — typed wrapper around the new MasterChatMessage
 * table introduced in Phase 1 of the master memory plan.
 *
 * Phase 2 (current): used as a dual-write target alongside the legacy
 * MasterSession.messages JSON blob. Reads still go through the legacy path.
 *
 * Phase 3+: will become the canonical read/write target; the JSON blob is
 * dropped after Phase 6.
 *
 * This module uses raw SQL via Prisma's $executeRawUnsafe / $queryRawUnsafe
 * for two reasons:
 *   1. Allows it to ship before the generated client picks up the new
 *      models (the Windows file lock on the dev-server-held DLL blocks
 *      `prisma generate`).
 *   2. The schema is small and fixed, so a typed wrapper is just as safe
 *      as the generated client without the rebuild dance.
 *
 * Errors are caught and logged but never thrown — the dual-write must NOT
 * break the user-facing chat flow if the new write path fails for any reason.
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
 * if the write failed (caller continues regardless).
 */
export async function appendMasterChatMessage(
  input: MasterChatMessageInput,
): Promise<string | null> {
  try {
    const turnIndex = await nextTurnIndex(input.userId, input.sessionId)
    const id = `mcm_${randomUUID().replace(/-/g, '').slice(0, 20)}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MasterChatMessage"
        ("id", "userId", "sessionId", "turnIndex", "role", "content",
         "toolCallsJson", "toolCallId", "tokenCount", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      id,
      input.userId,
      input.sessionId,
      turnIndex,
      input.role,
      input.content ?? null,
      input.toolCallsJson ?? null,
      input.toolCallId ?? null,
      input.tokenCount ?? null,
    )
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
    const rows = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
      `SELECT MAX("turnIndex") as max
       FROM "MasterChatMessage"
       WHERE "userId" = $1 AND "sessionId" = $2`,
      userId,
      sessionId,
    )
    const max = rows[0]?.max
    return max == null ? 0 : Number(max) + 1
  } catch (err) {
    console.error('[chatMessageStore] nextTurnIndex failed:', err)
    return 0
  }
}

/**
 * Load all non-archived messages for a session, ordered by turnIndex.
 * Used by Phase 3 reads. Returns an empty array on error.
 */
export async function loadMasterChatMessages(
  userId: string,
  sessionId: string,
  options: { includeArchived?: boolean } = {},
): Promise<MasterChatMessageRow[]> {
  try {
    const archivedClause = options.includeArchived
      ? ''
      : 'AND "archivedAt" IS NULL'
    const rows = await prisma.$queryRawUnsafe<MasterChatMessageRow[]>(
      `SELECT
         "id", "userId", "sessionId", "turnIndex", "role", "content",
         "toolCallsJson", "toolCallId", "tokenCount", "archivedAt", "createdAt"
       FROM "MasterChatMessage"
       WHERE "userId" = $1 AND "sessionId" = $2 ${archivedClause}
       ORDER BY "turnIndex" ASC`,
      userId,
      sessionId,
    )
    return rows
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
    const rows = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
      `SELECT COUNT(*)::bigint as c
       FROM "MasterChatMessage"
       WHERE "userId" = $1 AND "sessionId" = $2 AND "archivedAt" IS NULL`,
      userId,
      sessionId,
    )
    return Number(rows[0]?.c ?? 0)
  } catch (err) {
    console.error('[chatMessageStore] countMasterChatMessages failed:', err)
    return 0
  }
}

/**
 * Archive (soft-delete) all messages in a session by setting archivedAt = NOW.
 * Used by the "Start new session" soft-reset endpoint in Phase 5.
 */
export async function archiveSession(
  userId: string,
  sessionId: string,
): Promise<number> {
  try {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "MasterChatMessage"
       SET "archivedAt" = NOW()
       WHERE "userId" = $1 AND "sessionId" = $2 AND "archivedAt" IS NULL`,
      userId,
      sessionId,
    )
    return Number(result)
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
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "MasterChatMessage" WHERE "userId" = $1`,
      userId,
    )
    return Number(result)
  } catch (err) {
    console.error('[chatMessageStore] deleteAllMasterChatMessages failed:', err)
    return 0
  }
}

// ─── Phase 5: session id management ─────────────────────────────────────

/**
 * Returns the sessionId of the user's currently-active master chat session
 * (the latest non-archived row's sessionId), or null if there are no active
 * rows. Null means either: (a) brand-new user, or (b) the user just
 * soft-reset via "Start new session". In both cases the caller should
 * generate a fresh sessionId via generateSessionId().
 */
export async function getActiveSessionId(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ sessionId: string }[]>(
      `SELECT "sessionId" FROM "MasterChatMessage"
       WHERE "userId" = $1 AND "archivedAt" IS NULL
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      userId,
    )
    return rows[0]?.sessionId ?? null
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
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "MasterChatMessage"
       SET "archivedAt" = NOW()
       WHERE "userId" = $1 AND "archivedAt" IS NULL`,
      userId,
    )
    return Number(result)
  } catch (err) {
    console.error('[chatMessageStore] archiveAllUserMessages failed:', err)
    return 0
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
