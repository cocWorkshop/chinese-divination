import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { checkModelLimit } from '@/lib/rateLimit'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const [model1, model2] = await Promise.all([
    checkModelLimit(session.user.id, 'model1'),
    checkModelLimit(session.user.id, 'model2'),
  ])

  return NextResponse.json({
    model1: { remaining: model1.remaining, used: model1.used, dailyLimit: model1.dailyLimit, bonus: model1.bonus },
    model2: { remaining: model2.remaining, used: model2.used, dailyLimit: model2.dailyLimit, bonus: model2.bonus },
  })
}
