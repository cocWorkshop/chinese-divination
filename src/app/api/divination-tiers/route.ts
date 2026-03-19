export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DIVINATION_TYPES = ['bazi', 'iching', 'ziwei', 'qimen', 'fengshui', 'other']

export async function GET() {
  const settings = await prisma.adminSetting.findMany({
    where: {
      key: { in: DIVINATION_TYPES.map(t => `divinationType_${t}_tier`) },
    },
  })

  const tiers: Record<string, string> = {}
  for (const t of DIVINATION_TYPES) {
    const setting = settings.find(s => s.key === `divinationType_${t}_tier`)
    tiers[t] = setting?.value || 'normal'
  }

  return NextResponse.json(tiers)
}
