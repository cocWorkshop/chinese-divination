export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CURRENT_POLICY_VERSION } from '@/lib/policyVersion'

// GET: check if user needs to consent to updated policy
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ needsConsent: false })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { consentVersion: true },
  })

  return NextResponse.json({
    needsConsent: user?.consentVersion !== CURRENT_POLICY_VERSION,
    currentVersion: CURRENT_POLICY_VERSION,
    userVersion: user?.consentVersion || null,
  })
}

// POST: user agrees to current version
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      consentAt: new Date(),
      consentVersion: CURRENT_POLICY_VERSION,
    },
  })

  return NextResponse.json({ ok: true, version: CURRENT_POLICY_VERSION })
}
