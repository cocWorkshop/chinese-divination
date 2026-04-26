/**
 * GET /api/admin/funnel — funnel ops dashboard data.
 *
 * Returns:
 *   - stats: tentative/converted counts, conversion rate, stale count
 *   - tentativeUsers: list of recent tentatives with age + reading count
 *   - cutoffDays: current AdminSetting funnelCleanupDays (or default 90)
 *
 * Admin-only. Surfaces nothing not already in the DB; just collates it
 * for the /admin/funnel page.
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getFunnelStats, listTentativeUsers } from '@/lib/funnelCleanup'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const [stats, tentativeUsers] = await Promise.all([
    getFunnelStats(),
    listTentativeUsers(100),
  ])

  return NextResponse.json({
    stats,
    tentativeUsers,
  })
}
