export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAuth } from '@/lib/authLog'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || null
  const userAgent = req.headers.get('user-agent') || null

  const session = await auth()
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })
    if (user) {
      await logAuth({ action: 'logout', status: 'success', email: user.email, userId: session.user.id, ip, userAgent })
    }
  }

  return NextResponse.json({ ok: true })
}
