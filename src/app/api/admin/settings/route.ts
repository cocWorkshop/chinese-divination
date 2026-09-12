export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { clearLLMSettingsCache } from '@/lib/llm'

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const settings: Record<string, string> = await req.json()

  await Promise.all(
    Object.entries(settings).map(([key, value]) =>
      prisma.adminSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  )

  // LLM endpoint settings (model/timeout/tokens/reasoning) are served through
  // a 60s process cache — clear it so admin changes apply immediately.
  clearLLMSettingsCache()

  return NextResponse.json({ success: true })
}
