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

  const token = crypto.randomBytes(16).toString('hex')
  await prisma.reading.update({
    where: { id },
    data: { shareToken: token },
  })

  return NextResponse.json({ token })
}
