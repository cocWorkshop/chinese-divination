export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { cleanupLogs } from '@/lib/cleanupLogs'

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  const result = await cleanupLogs()

  return NextResponse.json(result)
}
