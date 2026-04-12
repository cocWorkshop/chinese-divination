/**
 * POST /api/admin/master-debug/[userId]/reset-portrait
 *
 * Hard-deletes UserPortrait + UserPortraitHistory for the target user.
 * Same effect as the user clicking "Permanently delete memory" themselves.
 * Admin-only. Requires non-empty `reason` in the body — recorded in
 * AdminAccessLog for audit.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { deletePortrait } from '@/lib/master/portraitStore'
import { logAdminAccess } from '@/lib/master/adminAccessLog'

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { error, user } = await requireAdmin()
  if (error) return error
  const { userId: targetUserId } = await params
  const adminUserId = user!.id

  let body: { reason?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* tolerate empty body */
  }
  const reason = (body.reason ?? '').trim()
  if (!reason) {
    return NextResponse.json(
      { error: 'reason is required for destructive admin actions' },
      { status: 400 },
    )
  }

  const result = await deletePortrait(targetUserId)
  await logAdminAccess({
    adminUserId,
    targetUserId,
    action: 'reset_portrait',
    reason,
    metadata: { result },
  })

  return NextResponse.json({ deleted: result.deleted })
}
