/**
 * PATCH /api/admin/master-debug/[userId]/toggle-enabled
 *
 * Toggles User.portraitEnabled on the target user's behalf. SENSITIVE
 * action — overrides a user preference without their direct consent. Only
 * use when the user has explicitly requested it via support.
 *
 * Admin-only. Requires `enabled` (boolean) and non-empty `reason`.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { logAdminAccess } from '@/lib/master/adminAccessLog'

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { error, user } = await requireAdmin()
  if (error) return error
  const { userId: targetUserId } = await params
  const adminUserId = user!.id

  let body: { enabled?: boolean; reason?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json(
      { error: 'enabled (boolean) is required' },
      { status: 400 },
    )
  }
  const reason = (body.reason ?? '').trim()
  if (!reason) {
    return NextResponse.json(
      { error: 'reason is required when overriding a user preference' },
      { status: 400 },
    )
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "portraitEnabled" = $2 WHERE "id" = $1`,
    targetUserId,
    body.enabled,
  )

  await logAdminAccess({
    adminUserId,
    targetUserId,
    action: 'toggle_enabled',
    reason,
    metadata: { enabled: body.enabled },
  })

  return NextResponse.json({ enabled: body.enabled })
}
