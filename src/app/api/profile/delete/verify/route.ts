export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { deleteToken: token },
    select: { email: true, createdAt: true, deleteTokenExpiry: true },
  })

  if (!user || !user.deleteTokenExpiry || user.deleteTokenExpiry < new Date()) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true, email: user.email, createdAt: user.createdAt })
}
