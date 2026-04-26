/**
 * DELETE /api/admin/funnel/[userId] — drop a single tentative user.
 *
 * Admin-only. Refuses to delete a non-tentative user (use the regular
 * user-management surface for those). Reading rows attached cascade.
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ userId: string }>
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { error } = await requireAdmin()
  if (error) return error

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // Guard: only tentative users can be deleted via this admin endpoint.
  // Real accounts have a separate user-management surface.
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tentative: true, email: true },
  })
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (!target.tentative) {
    return NextResponse.json(
      { error: 'Refusing to delete a non-tentative user from this endpoint' },
      { status: 400 },
    )
  }

  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ deleted: true, email: target.email })
}
