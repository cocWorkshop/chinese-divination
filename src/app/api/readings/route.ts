export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 500-row ceiling for the dashboard's client-side "Load more" pagination.
// Users realistically stay far below this; the cap only stops pathological
// accounts from shipping multi-MB responses.
const MAX_ROWS = 500

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Metadata + preview columns only. The dashboard reads id/type/status/
  // question/createdAt/targetType/rating, a ~120-char preview + a few JSON
  // keys from `result`, and selected birth keys from `inputData` — it never
  // renders calculationData / llmPrompt / llmRawOutput / chatMessages, which
  // are multi-KB TEXT columns per row. The detail endpoint serves full data.
  // No take-limit by design: the client paginates locally and shows the
  // total count — capped at MAX_ROWS above.
  const readings = await prisma.reading.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
    select: {
      id: true,
      type: true,
      status: true,
      question: true,
      createdAt: true,
      targetType: true,
      rating: true,
      inputData: true,
      result: true,
      familyMember: { select: { relation: true, name: true } },
    },
  })

  return NextResponse.json({ readings })
}
