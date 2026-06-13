/**
 * Admin access log helper. Records every admin action against another user's
 * master memory state. The log is surfaced in the admin debug page itself
 * (peer-policing) and included in the user's GDPR data export.
 */

import { prisma } from '../prisma'

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
    const metadataJson = input.metadata != null ? JSON.stringify(input.metadata).slice(0, 8000) : null
    const row = await prisma.adminAccessLog.create({
      data: {
        adminUserId: input.adminUserId,
        targetUserId: input.targetUserId,
        action: input.action,
        reason: input.reason ?? null,
        metadata: metadataJson,
      },
      select: { id: true },
    })
    return row.id
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
    const rows = await prisma.adminAccessLog.findMany({
      where: { targetUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { adminUser: { select: { email: true } } },
    })
    return rows.map((r) => ({
      id: r.id,
      adminUserId: r.adminUserId,
      targetUserId: r.targetUserId,
      action: r.action,
      reason: r.reason,
      metadata: r.metadata,
      createdAt: r.createdAt,
      adminEmail: r.adminUser?.email ?? null,
    }))
  } catch (err) {
    console.error('[adminAccessLog] loadAdminAccessLogForTarget failed:', err)
    return []
  }
}
