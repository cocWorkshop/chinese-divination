export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = crypto.randomBytes(8).toString('hex')
  
  await prisma.shareLink.create({
    data: {
      userId: session.user.id,
      code,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:8094'
  return NextResponse.json({ code, url: `${baseUrl}/share/${code}` })
}
