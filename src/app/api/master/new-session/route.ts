/**
 * POST /api/master/new-session
 *
 * Soft reset for the master chat. Archives all current MasterChatMessage
 * rows for the user (sets archivedAt = NOW) so the next master interaction
 * starts a fresh session with a new sessionId. UserPortrait and chart data
 * are preserved — the user's identity persists across the reset.
 *
 * Distinct from DELETE /api/master ("Forget everything") which hard-deletes
 * portrait + history + chat. The two are visually + linguistically distinct
 * in the widget UI to avoid confusion.
 */

export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { archiveAllUserMessages } from '@/lib/master/chatMessageStore'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const archived = await archiveAllUserMessages(session.user.id)

    return new Response(
      JSON.stringify({ success: true, archivedCount: archived }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[master/new-session] error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
