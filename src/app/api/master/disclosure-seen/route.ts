/**
 * PATCH /api/master/disclosure-seen
 *
 * Marks the master memory disclosure modal as seen for the current user.
 * Called by the widget once after the user dismisses or interacts with the
 * disclosure modal. Sets User.masterMemoryDisclosureSeenAt = NOW.
 *
 * This is idempotent — if already set, it's a no-op (we don't overwrite the
 * original timestamp).
 */

export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Idempotent: only set if currently null
    await prisma.$executeRawUnsafe(
      `UPDATE "User"
       SET "masterMemoryDisclosureSeenAt" = NOW()
       WHERE "id" = $1 AND "masterMemoryDisclosureSeenAt" IS NULL`,
      session.user.id,
    )

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[master/disclosure-seen] error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
