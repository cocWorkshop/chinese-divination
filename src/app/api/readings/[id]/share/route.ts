export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const reading = await prisma.reading.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { id: true, shareToken: true },
  })

  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return existing token or generate new one
  if (reading.shareToken) {
    return NextResponse.json({ token: reading.shareToken })
  }

  // Generate a short URL-safe token. The page it unlocks is unauthenticated and
  // exposes the reading + birth PII, so use a CSPRNG (not Math.random) and 12
  // chars (~71 bits) to make the token unguessable.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(12)
  let token = ''
  for (let i = 0; i < 12; i++) token += chars[bytes[i] % chars.length]
  await prisma.reading.update({
    where: { id },
    data: { shareToken: token },
  })

  return NextResponse.json({ token })
}

/**
 * Revoke the share link (audit P5). Clears shareToken — the public page
 * (/r/[token]) immediately 404s for that link. Previously the only way to
 * un-share was soft-deleting the whole reading.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const revoked = await prisma.reading.updateMany({
    where: { id, userId: session.user.id, deletedAt: null, shareToken: { not: null } },
    data: { shareToken: null },
  })

  // 0 rows = not found OR already un-shared — both are success states for
  // the caller (idempotent revoke).
  return NextResponse.json({ success: true, revoked: revoked.count > 0 })
}
