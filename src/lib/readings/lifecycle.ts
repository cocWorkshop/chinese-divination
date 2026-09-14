/**
 * Reading lifecycle service (architecture plan I9 + I5).
 *
 * The pending → completed/failed state machine used to be spread across five
 * call sites in two routes, with stale cleanup as a fire-and-forget side
 * effect of /init. This module owns it in one place — including the credit
 * refund discipline for held credits (Reading.creditsHeld, written by /init):
 *
 *   pending ──markCompleted──▶ completed   (hold is simply kept = paid)
 *   pending ──markFailed─────▶ failed      (hold refunded, exactly once)
 *   pending ──cleanupStale───▶ failed      (same refund path, >15 min old)
 *
 * Refund atomicity: the single-winner UPDATE … RETURNING on creditsHeld
 * guarantees a hold can never be refunded twice even under concurrent
 * markFailed calls (e.g. route error handler racing the stale sweeper).
 */

import { prisma } from '../prisma'
import type { Prisma } from '@prisma/client'
import { logCreditChange } from '../creditLogger'
import { logger } from '../logger'

const STALE_PENDING_MS = 15 * 60 * 1000

const log = logger.child({ module: 'readingLifecycle' })

/** Mark a pending reading completed and persist the final result. Returns the row. */
export async function markCompleted(
  readingId: string,
  data: { result: string; llmPrompt?: string; llmRawOutput?: string }
): Promise<Record<string, unknown>> {
  return prisma.reading.update({
    where: { id: readingId },
    data: { status: 'completed', ...data },
  }) as Promise<Record<string, unknown>>
}

/**
 * Mark a reading failed (never clobbers a completed one) and refund any held
 * credits exactly once. Safe to call multiple times / concurrently.
 *
 * The status flip and the refund run in ONE transaction — a process crash
 * between them would otherwise leave a failed reading whose hold was never
 * refunded (the stale sweeper only scans `pending` rows).
 */
export async function markFailed(
  readingId: string,
  opts: { reason: string; llmRawOutput?: string }
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.reading.updateMany({
        where: { id: readingId, status: { not: 'completed' } },
        data: {
          status: 'failed',
          result: opts.reason,
          ...(opts.llmRawOutput !== undefined ? { llmRawOutput: opts.llmRawOutput } : {}),
        },
      })
      await refundHold(readingId, tx)
    })
  } catch (err) {
    log.error({ err, readingId }, 'markFailed error')
  }
}

/**
 * Refund a reading's held credits, exactly once (single-winner UPDATE…RETURNING
 * zeroes the hold and reports the amount only to the first caller).
 * No-op for readings without a hold. Never called for completed readings by
 * the flows above; guarded here too for safety.
 */
export async function refundHold(
  readingId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  // Single statement: SELECT … FOR UPDATE claims the row, the UPDATE zeroes it,
  // and RETURNING reports the PRE-update amount via the CTE. Concurrent callers
  // serialize on the row lock; the loser sees creditsHeld=0 and gets no rows.
  const db = tx ?? prisma
  const result = await db.$queryRaw<Array<{ held: number; userId: string; type: string }>>`
    WITH claimed AS (
      SELECT id, "creditsHeld", "userId", type FROM "Reading"
      WHERE id = ${readingId} AND "creditsHeld" > 0 AND status <> 'completed'
      FOR UPDATE
    ), zeroed AS (
      UPDATE "Reading" r SET "creditsHeld" = 0
      FROM claimed c WHERE r.id = c.id
      RETURNING c."creditsHeld" AS held, c."userId", c.type
    )
    SELECT held, "userId", type FROM zeroed
  `
  if (!result || result.length === 0) return 0
  const { held, userId, type } = result[0]
  if (held <= 0) return 0
  const updated = await db.user.update({
    where: { id: userId },
    data: { credits: { increment: held } },
    select: { credits: true },
  })
  await logCreditChange({
    userId,
    action: 'refund',
    amount: held,
    balance: updated.credits,
    source: `divination:${type}`,
    note: `refund hold reading=${readingId}`,
  })
  log.info({ readingId, userId, refunded: held }, 'hold refunded')
  return held
}

/**
 * Fail (and refund) pending readings older than STALE_PENDING_MS.
 * Runs on the in-process job scheduler — no longer a request-path side effect.
 */
export async function cleanupStaleReadings(): Promise<void> {
  try {
    const stale = await prisma.reading.findMany({
      where: { status: 'pending', createdAt: { lt: new Date(Date.now() - STALE_PENDING_MS) } },
      select: { id: true },
    })
    for (const r of stale) {
      await markFailed(r.id, { reason: 'Timed out — server did not complete processing' })
    }
    if (stale.length > 0) log.info({ count: stale.length }, 'stale pending readings failed + refunded')
  } catch (err) {
    log.error({ err }, 'cleanupStaleReadings error')
  }
}
