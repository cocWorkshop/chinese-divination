/**
 * GET    /api/master/sessions/[sessionId] — fetch full transcript for a session.
 * DELETE /api/master/sessions/[sessionId] — hard-delete all rows for a session.
 *
 * Both routes scope queries to the authenticated user so a sessionId from
 * another user (or a forged value) cannot leak or delete foreign data.
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { loadMasterChatMessages, deleteSession } from '@/lib/master/chatMessageStore'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { sessionId } = await params

  const rows = await loadMasterChatMessages(session.user.id, sessionId, {
    includeArchived: true,
  })

  // Only surface user-visible turns in the transcript view. System / tool
  // rows are persisted for auditability but aren't meaningful to show to
  // the end user on the history page.
  const messages = rows
    .filter((r) => r.role === 'user' || r.role === 'assistant')
    .map((r) => ({
      role: r.role,
      content: r.content ?? '',
      createdAt: r.createdAt.toISOString(),
      turnIndex: r.turnIndex,
    }))

  return NextResponse.json(
    { sessionId, messages },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { sessionId } = await params

  const deleted = await deleteSession(session.user.id, sessionId)
  if (deleted === 0) {
    // Either the session didn't exist or it belonged to someone else — same
    // response either way to avoid leaking existence information.
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ deleted })
}
