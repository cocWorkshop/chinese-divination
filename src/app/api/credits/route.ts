export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkDivinationCredits, checkChatCredits } from '@/lib/rateLimit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const [divination, chat, timeoutSetting] = await Promise.all([
    checkDivinationCredits(session.user.id),
    checkChatCredits(session.user.id),
    prisma.adminSetting.findUnique({ where: { key: 'llmTimeoutSeconds' } }),
  ])

  const llmTimeoutSeconds = parseInt(timeoutSetting?.value || '240', 10) || 240

  return NextResponse.json({
    divination: { remaining: divination.remaining },
    chat: { remaining: chat.remaining },
    llmTimeoutSeconds,
  })
}
