/**
 * GET /api/master/sessions
 *
 * Returns every master chat session for the authenticated user, newest first.
 * Used by /profile/portrait's chat-history section. A session is "active"
 * when it still has non-archived rows (there is at most one such session
 * per user at a time; all older sessions have been archived by the
 * "New chat" flow or a prior hard-delete).
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listUserSessions } from '@/lib/master/chatMessageStore'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessions = await listUserSessions(session.user.id)
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt.toISOString(),
      totalTurns: s.totalTurns,
      userTurns: s.userTurns,
      isActive: s.isActive,
      firstUserMessage: s.firstUserMessage,
    })),
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
