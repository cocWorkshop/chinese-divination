/**
 * PATCH /api/profile/portrait/enabled
 *
 * Toggles User.portraitEnabled. When false:
 *   - Portrait extraction is skipped on master turns
 *   - The personalized prompt block is omitted from the system prompt
 *   - Existing portrait data is preserved (dormant), not deleted
 *
 * Disable ≠ delete. To hard-delete, use DELETE /api/profile/portrait.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { enabled?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Body must include { enabled: boolean }' }, { status: 400 })
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "portraitEnabled" = $2 WHERE "id" = $1`,
    session.user.id,
    body.enabled,
  )

  return NextResponse.json({ enabled: body.enabled })
}
