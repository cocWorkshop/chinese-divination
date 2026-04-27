export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/master/cta-status?type=bazi&since=ISO[&target=self|family]
 *
 * Used by the Master widget's activation-resume dispatcher to find out
 * whether a CTA card emitted earlier in the conversation has since been
 * "fulfilled" — i.e. the user actually completed a reading of the matching
 * type after the CTA was sent. Without this, a user who closes the widget,
 * does the reading on another device or tab, and reopens the widget would
 * see a stale CTA the master can't reason about.
 *
 * Phase 1 keeps it simple: match by (type, target, createdAt > since). For
 * family CTAs we don't try to reverse-look-up the familyMemberId from the
 * CTA's `target` string — too fragile. Instead we accept any family-target
 * reading of the right type as "completed" — false positive rate is low
 * enough to be acceptable, and the master will still call list_readings to
 * pull the right one when it actually starts the analysis.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const since = searchParams.get('since')
  const target = searchParams.get('target')

  if (!type) return jsonError('Missing type', 400)
  if (!since) return jsonError('Missing since', 400)
  const sinceDate = new Date(since)
  if (Number.isNaN(sinceDate.getTime())) {
    return jsonError('Invalid since timestamp', 400)
  }
  const targetType = target === 'family' ? 'family' : 'self'

  const reading = await prisma.reading.findFirst({
    where: {
      userId,
      type,
      targetType,
      deletedAt: null,
      createdAt: { gte: sinceDate },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true },
  })

  if (!reading) {
    return jsonResponse({ completed: false })
  }
  return jsonResponse({
    completed: true,
    readingId: reading.id,
    completedAt: reading.createdAt.toISOString(),
  })
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
