/**
 * POST /api/admin/master-debug/[userId]/clear-chat
 *
 * Hard-deletes all MasterChatMessage rows for the target user. Useful when
 * a user reports the master is "stuck" on bad context — admin can clear
 * the slate without touching the user's portrait or chart data.
 *
 * Admin-only. Requires non-empty `reason` in the body — recorded in
 * AdminAccessLog for audit.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { deleteAllMasterChatMessages } from '@/lib/master/chatMessageStore'
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

  const deletedCount = await deleteAllMasterChatMessages(targetUserId)
  await logAdminAccess({
    adminUserId,
    targetUserId,
    action: 'clear_chat',
    reason,
    metadata: { deletedCount },
  })

  return NextResponse.json({ deletedCount })
}
