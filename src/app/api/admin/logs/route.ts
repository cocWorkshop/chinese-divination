import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } })
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const logs = await prisma.llmLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Fetch user emails for display
  const userIds: string[] = logs.map(l => l.userId).filter((id): id is string => id !== null)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, { email: u.email, name: u.name }]))

  const logsWithUser = logs.map(l => ({
    ...l,
    user: l.userId ? userMap[l.userId] || null : null,
  }))

  return NextResponse.json({ logs: logsWithUser })
}
