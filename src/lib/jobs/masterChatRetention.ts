/**
 * Master chat retention job (audit P1).
 *
 * MasterChatMessage rows are only ever soft-archived (archivedAt set) —
 * archived rows are never re-read by the app, but nothing ever deleted
 * them, so the table grew without bound. This job hard-deletes archived
 * rows older than MASTER_CHAT_RETENTION_DAYS (default 180).
 *
 * Non-archived (active-session) rows are NEVER touched. GDPR full export
 * (profile/export) exports whatever still exists at request time; the
 * retention window is a deliberate data-lifetime policy — adjust via env
 * if the compliance posture requires longer.
 *
 * Set MASTER_CHAT_RETENTION_DRY_RUN=1 to observe counts without deleting.
 */

import { prisma } from '../prisma'
import { logger } from '../logger'

const DEFAULT_RETENTION_DAYS = 180
const BATCH_SIZE = 5000

const log = logger.child({ job: 'masterChatRetention' })

export function resolveMasterChatRetentionDays(): number {
  const parsed = parseInt(process.env.MASTER_CHAT_RETENTION_DAYS || '', 10)
  return parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS
}

export async function runMasterChatRetention(): Promise<void> {
  const dryRun = process.env.MASTER_CHAT_RETENTION_DRY_RUN === '1'
  const days = resolveMasterChatRetentionDays()
  const cutoff = new Date(Date.now() - days * 86400_000)

  try {
    const where = { archivedAt: { lt: cutoff } }

    if (dryRun) {
      const count = await prisma.masterChatMessage.count({ where })
      log.info({ dryRun, days, rowsToDelete: count }, 'master chat retention dry run')
      return
    }

    // Batched deletes: a single unbounded deleteMany on a large table
    // holds row locks for too long.
    let totalDeleted = 0
    for (;;) {
      const rows = await prisma.masterChatMessage.findMany({
        where,
        select: { id: true },
        take: BATCH_SIZE,
      })
      if (rows.length === 0) break
      const batch = await prisma.masterChatMessage.deleteMany({
        where: { id: { in: rows.map(r => r.id) } },
      })
      totalDeleted += batch.count
      if (rows.length < BATCH_SIZE) break
    }
    log.info({ days, rowsDeleted: totalDeleted }, 'master chat retention completed')
  } catch (err) {
    // Never let a failed purge affect the serving process; next run retries.
    log.error({ err }, 'master chat retention failed')
  }
}
