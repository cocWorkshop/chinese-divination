import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// Short URL-safe token generator

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

  // Generate short 8-char URL-safe token
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 8; i++) token += chars[Math.floor(Math.random() * chars.length)]
  await prisma.reading.update({
    where: { id },
    data: { shareToken: token },
  })

  return NextResponse.json({ token })
}
