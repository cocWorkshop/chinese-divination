/**
 * Log retention / PII purge job.
 *
 * Policy (architecture plan I7):
 *   - LlmLog rows older than 90 days: NULL the PII-bearing text columns
 *     (inputPreview / outputPreview / systemPrompt — they contain users'
 *     birth data and life context). Token/latency/status metrics and
 *     errorMessage are kept for long-term diagnostics.
 *   - AuthLog rows older than 365 days: deleted (email + IP at rest).
 *   - CreditLog: NEVER touched — it is the billing audit trail.
 *
 * Set LOG_PURGE_DRY_RUN=1 to log the affected row counts without writing —
 * use this to observe the first production run before enabling for real.
 */

import { prisma } from '../prisma'
import { logger } from '../logger'

const LLMLOG_PII_RETENTION_DAYS = 90
const AUTHLOG_RETENTION_DAYS = 365

const log = logger.child({ job: 'logRetention' })

export async function runLogRetention(): Promise<void> {
  const dryRun = process.env.LOG_PURGE_DRY_RUN === '1'
  const llmCutoff = new Date(Date.now() - LLMLOG_PII_RETENTION_DAYS * 86400_000)
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
    const authWhere = { createdAt: { lt: authCutoff } }

    if (dryRun) {
      const [llmCount, authCount] = await Promise.all([
        prisma.llmLog.count({ where: llmWhere }),
        prisma.authLog.count({ where: authWhere }),
      ])
      log.info({ dryRun, llmRowsToScrub: llmCount, authRowsToDelete: authCount }, 'log retention dry run')
      return
    }

    const scrubbed = await prisma.llmLog.updateMany({
      where: llmWhere,
      data: { inputPreview: null, outputPreview: null, systemPrompt: null },
    })
    const deleted = await prisma.authLog.deleteMany({ where: authWhere })
    log.info({ llmRowsScrubbed: scrubbed.count, authRowsDeleted: deleted.count }, 'log retention completed')
  } catch (err) {
    // Never let a failed purge affect the serving process; next daily run retries.
    log.error({ err }, 'log retention failed')
  }
}
