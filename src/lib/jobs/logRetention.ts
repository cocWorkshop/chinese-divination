/**
 * Log retention / PII purge job.
 *
 * Policy (architecture plan I7 + audit P12):
 *   - LlmLog rows older than 90 days: NULL the PII-bearing text columns
 *     (inputPreview / outputPreview / systemPrompt — they contain users'
 *     birth data and life context). Token/latency/status metrics and
 *     errorMessage are kept for long-term diagnostics.
 *   - LlmLog rows older than 180 days: hard-deleted. Between 90-180 days
 *     the metrics-only rows stay useful for latency/cost analysis; past
 *     that they are pure table growth (row count previously grew without
 *     bound — deletion was only available via the manual admin endpoint).
 *   - AuthLog rows older than 365 days: deleted (email + IP at rest).
 *   - CreditLog: NEVER touched — it is the billing audit trail.
 *
 * Set LOG_PURGE_DRY_RUN=1 to log the affected row counts without writing —
 * use this to observe the first production run before enabling for real.
 */

import { prisma } from '../prisma'
import { logger } from '../logger'

const LLMLOG_PII_RETENTION_DAYS = 90
const LLMLOG_HARD_DELETE_DAYS = 180
const AUTHLOG_RETENTION_DAYS = 365

const log = logger.child({ job: 'logRetention' })

export async function runLogRetention(): Promise<void> {
  const dryRun = process.env.LOG_PURGE_DRY_RUN === '1'
  const llmCutoff = new Date(Date.now() - LLMLOG_PII_RETENTION_DAYS * 86400_000)
  const llmDeleteCutoff = new Date(Date.now() - LLMLOG_HARD_DELETE_DAYS * 86400_000)
  const authCutoff = new Date(Date.now() - AUTHLOG_RETENTION_DAYS * 86400_000)

  try {
    // Only rows that still carry PII — keeps the daily run cheap after the
    // first sweep (already-nulled rows don't match again).
    const llmWhere = {
      createdAt: { lt: llmCutoff },
      OR: [
        { inputPreview: { not: null } },
        { outputPreview: { not: null } },
        { systemPrompt: { not: null } },
      ],
    }
    const llmDeleteWhere = { createdAt: { lt: llmDeleteCutoff } }
    const authWhere = { createdAt: { lt: authCutoff } }

    if (dryRun) {
      const [llmCount, llmDeleteCount, authCount] = await Promise.all([
        prisma.llmLog.count({ where: llmWhere }),
        prisma.llmLog.count({ where: llmDeleteWhere }),
        prisma.authLog.count({ where: authWhere }),
      ])
      log.info(
        { dryRun, llmRowsToScrub: llmCount, llmRowsToDelete: llmDeleteCount, authRowsToDelete: authCount },
        'log retention dry run'
      )
      return
    }

    const scrubbed = await prisma.llmLog.updateMany({
      where: llmWhere,
      data: { inputPreview: null, outputPreview: null, systemPrompt: null },
    })
    const llmDeleted = await prisma.llmLog.deleteMany({ where: llmDeleteWhere })
    const deleted = await prisma.authLog.deleteMany({ where: authWhere })
    log.info(
      { llmRowsScrubbed: scrubbed.count, llmRowsDeleted: llmDeleted.count, authRowsDeleted: deleted.count },
      'log retention completed'
    )
  } catch (err) {
    // Never let a failed purge affect the serving process; next daily run retries.
    log.error({ err }, 'log retention failed')
  }
}
