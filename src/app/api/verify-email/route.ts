export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
    select: { id: true, emailVerified: true, tokenExpiry: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  if (user.emailVerified) {
    return NextResponse.json({ status: 'already_verified' })
  }

  if (user.tokenExpiry && new Date() > user.tokenExpiry) {
    return NextResponse.json({ error: 'expired' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      tokenExpiry: null,
    },
  })

  return NextResponse.json({ status: 'verified' })
}
