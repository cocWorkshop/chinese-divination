/**
 * Funnel cleanup helpers — find and remove abandoned tentative users.
 *
 * A tentative user is created when somebody enters an email at /start/cast
 * but never completes /start/unlock. They occupy a row in `User` plus
 * usually a Reading row. Left alone, these accumulate forever.
 *
 * Default cutoff: 90 days. Admin-tunable via AdminSetting key
 * `funnelCleanupDays`. Cleanup is triggered manually from the /admin/funnel
 * page; can also be called from a cron job hitting POST /api/admin/funnel/cleanup
 * with an admin token.
 *
 * Cascade: User → Reading is FK with onDelete: Cascade, so deleting the
 * User row drops their tentative readings automatically.
 */

import { prisma } from './prisma'

export const DEFAULT_CLEANUP_DAYS = 90

/** Returns the current cleanup cutoff in days, reading AdminSetting `funnelCleanupDays`. */
export async function resolveCleanupDays(): Promise<number> {
  const setting = await prisma.adminSetting.findUnique({ where: { key: 'funnelCleanupDays' } })
  if (!setting) return DEFAULT_CLEANUP_DAYS
  const n = parseInt(setting.value, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CLEANUP_DAYS
}

export interface CleanupResult {
  deleted: number
  cutoffDays: number
  cutoffDate: string
}

/**
 * Delete all tentative users whose `createdAt` is older than `daysOld`.
 * Returns the count of deleted users (Reading rows cascade automatically).
 */
export async function cleanupTentativeUsers(daysOld: number): Promise<CleanupResult> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
  const result = await prisma.user.deleteMany({
    where: {
      tentative: true,
      createdAt: { lt: cutoffDate },
    },
  })
  return {
    deleted: result.count,
    cutoffDays: daysOld,
    cutoffDate: cutoffDate.toISOString(),
  }
}

export interface FunnelStats {
  /** All-time count of tentative rows currently in the DB. */
  tentativeTotal: number
  /** Tentatives created in the last 24h / 7d / 30d. */
  tentativeRecent: { d1: number; d7: number; d30: number }
  /** Users who completed funnel (signupCompletedAt is set). */
  convertedTotal: number
  /** Funnel conversions in the last 24h / 7d / 30d. */
  convertedRecent: { d1: number; d7: number; d30: number }
  /** Conversion rate = converted / (converted + tentative), all-time. */
  conversionRate: number
  /** Tentatives that would be deleted at the current cutoff. */
  staleAtCurrentCutoff: number
  cutoffDays: number
}

export async function getFunnelStats(): Promise<FunnelStats> {
  const cutoffDays = await resolveCleanupDays()
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const cutoffStale = new Date(now - cutoffDays * day)
  const cutoff1 = new Date(now - 1 * day)
  const cutoff7 = new Date(now - 7 * day)
  const cutoff30 = new Date(now - 30 * day)

  const [
    tentativeTotal,
    tentativeD1,
    tentativeD7,
    tentativeD30,
    convertedTotal,
    convertedD1,
    convertedD7,
    convertedD30,
    staleAtCurrentCutoff,
  ] = await Promise.all([
    prisma.user.count({ where: { tentative: true } }),
    prisma.user.count({ where: { tentative: true, createdAt: { gte: cutoff1 } } }),
    prisma.user.count({ where: { tentative: true, createdAt: { gte: cutoff7 } } }),
    prisma.user.count({ where: { tentative: true, createdAt: { gte: cutoff30 } } }),
    prisma.user.count({ where: { signupCompletedAt: { not: null } } }),
    prisma.user.count({ where: { signupCompletedAt: { gte: cutoff1 } } }),
    prisma.user.count({ where: { signupCompletedAt: { gte: cutoff7 } } }),
    prisma.user.count({ where: { signupCompletedAt: { gte: cutoff30 } } }),
    prisma.user.count({ where: { tentative: true, createdAt: { lt: cutoffStale } } }),
  ])

  const totalEntries = convertedTotal + tentativeTotal
  const conversionRate = totalEntries > 0 ? convertedTotal / totalEntries : 0

  return {
    tentativeTotal,
    tentativeRecent: { d1: tentativeD1, d7: tentativeD7, d30: tentativeD30 },
    convertedTotal,
    convertedRecent: { d1: convertedD1, d7: convertedD7, d30: convertedD30 },
    conversionRate,
    staleAtCurrentCutoff,
    cutoffDays,
  }
}

export interface TentativeUserRow {
  id: string
  email: string
  createdAt: string
  funnelSource: unknown
  ageDays: number
  readingCount: number
}

/**
 * List recent tentative users for the admin table. Limit defaults to 50 —
 * this isn't the place to browse 10k rows; bulk cleanup happens via the
 * cleanup endpoint, individual deletes via DELETE /api/admin/funnel/[id].
 */
export async function listTentativeUsers(limit = 50): Promise<TentativeUserRow[]> {
  const users = await prisma.user.findMany({
    where: { tentative: true },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      id: true,
      email: true,
      createdAt: true,
      funnelSource: true,
      _count: { select: { readings: true } },
    },
  })
  const now = Date.now()
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    funnelSource: u.funnelSource,
    ageDays: Math.floor((now - u.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    readingCount: u._count.readings,
  }))
}
