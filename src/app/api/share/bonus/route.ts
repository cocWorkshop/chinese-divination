export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [s1, s2] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } }),
    prisma.adminSetting.findUnique({ where: { key: 'registerBonus' } }),
  ])

  return NextResponse.json({
    shareBonus: parseInt(s1?.value ?? '3'),
    registerBonus: parseInt(s2?.value ?? '6'),
    // Legacy fields for backward compatibility
    divination: parseInt(s1?.value ?? '3'),
    chat: 0,
  }, { headers: { 'Cache-Control': 'public, max-age=300' } })
}
