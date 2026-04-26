/**
 * POST /api/admin/funnel/cleanup — manual cleanup trigger.
 *
 * Body (optional): `{ daysOld?: number }` — override the AdminSetting cutoff
 * for this single run (e.g. an aggressive 30 to clear noise after a launch).
 * Defaults to AdminSetting `funnelCleanupDays`, which defaults to 90.
 *
 * Admin-only. Deletes tentative User rows older than the cutoff. Reading
 * rows attached to those users cascade-delete via the FK.
 *
 * Future: this endpoint can also be called by a cron job (Vercel Cron, an
 * external scheduler hitting it with a CRON_TOKEN header, etc.) to fully
 * automate the sweep. For now we keep it admin-only and trigger it from
 * the /admin/funnel page button.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { cleanupTentativeUsers, resolveCleanupDays } from '@/lib/funnelCleanup'

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const overrideDays = typeof body.daysOld === 'number' && body.daysOld > 0 ? body.daysOld : null
  const daysOld = overrideDays ?? (await resolveCleanupDays())

  const result = await cleanupTentativeUsers(daysOld)
  return NextResponse.json(result)
}
