import { auth } from './auth'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null }
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true },
  })
  if (!user?.isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null }
  }
  return { error: null, user }
}
