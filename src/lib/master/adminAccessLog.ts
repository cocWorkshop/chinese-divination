/**
 * Admin access log helper. Records every admin action against another user's
 * master memory state. The log is surfaced in the admin debug page itself
 * (peer-policing) and included in the user's GDPR data export.
 *
 * Uses raw SQL via prisma.$executeRawUnsafe so it works regardless of
 * whether the generated client has picked up the new model.
 */

import { prisma } from '../prisma'
import { randomUUID } from 'node:crypto'

export type AdminAccessAction =
  | 'view_master_debug'
  | 'force_extract_portrait'
  | 'reset_portrait'
  | 'clear_chat'
  | 'toggle_enabled'

export interface LogAdminAccessInput {
  adminUserId: string
  targetUserId: string
  action: AdminAccessAction
  reason?: string | null
  /** Optional structured metadata (e.g. dry-run output) — JSON-serialized. */
  metadata?: unknown
}

/**
 * Best-effort INSERT — never throws. Failures are logged but don't break
 * the admin action itself (we'd rather have the action without a log row
 * than block ops on a transient DB issue).
 */
export async function logAdminAccess(input: LogAdminAccessInput): Promise<string | null> {
  try {
    const id = `aal_${randomUUID().replace(/-/g, '').slice(0, 20)}`
    const metadataJson = input.metadata != null ? JSON.stringify(input.metadata).slice(0, 8000) : null
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdminAccessLog"
        ("id", "adminUserId", "targetUserId", "action", "reason", "metadata", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      id,
      input.adminUserId,
      input.targetUserId,
      input.action,
      input.reason ?? null,
      metadataJson,
    )
    return id
  } catch (err) {
    console.error('[adminAccessLog] logAdminAccess failed:', err)
    return null
  }
}

export interface AdminAccessLogRow {
  id: string
  adminUserId: string
  targetUserId: string
  action: string
  reason: string | null
  metadata: string | null
  createdAt: Date
  adminEmail?: string | null
}

/**
 * Load access log entries for a specific target user, newest first.
 * Joins on User to surface the admin's email for display.
 */
export async function loadAdminAccessLogForTarget(
  targetUserId: string,
  limit = 20,
): Promise<AdminAccessLogRow[]> {
  try {
    return await prisma.$queryRawUnsafe<AdminAccessLogRow[]>(
      `SELECT
         a."id", a."adminUserId", a."targetUserId", a."action", a."reason",
         a."metadata", a."createdAt", u."email" as "adminEmail"
       FROM "AdminAccessLog" a
       LEFT JOIN "User" u ON u."id" = a."adminUserId"
       WHERE a."targetUserId" = $1
       ORDER BY a."createdAt" DESC
       LIMIT $2`,
      targetUserId,
      limit,
    )
  } catch (err) {
    console.error('[adminAccessLog] loadAdminAccessLogForTarget failed:', err)
    return []
  }
}
