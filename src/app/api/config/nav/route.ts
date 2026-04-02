export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint - returns nav visibility flags (no auth required)
export async function GET() {
  const settings = await prisma.adminSetting.findMany({
    where: { key: { in: ['showWikiNav'] } },
  })

  const map: Record<string, boolean> = {
    showWikiNav: false,
  }
  for (const s of settings) {
    map[s.key] = s.value === 'true'
  }

  return NextResponse.json(map)
}
