/**
 * Race-condition regression tests for the billing guards (audit round 2,
 * fixes A1-A3). Each test attacks the exact TOCTOU window the fixes closed,
 * by firing the racing requests concurrently against the dev database.
 *
 *   - gift claim: N concurrent claims on a 1-slot link → exactly 1 wins,
 *     claimCount never exceeds maxClaims, no double credits.
 *   - start/complete: concurrent conversions → register bonus granted once.
 *   - register referral: concurrent signups on one referral code →
 *     sharer credited once, link flipped once.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'

// funnelSession signs cookies with NEXTAUTH_SECRET — absent in the test env.
process.env.NEXTAUTH_SECRET ||= 'test-secret-for-funnel-signing'

const state = vi.hoisted(() => ({ userId: null as string | null }))
vi.mock('@/lib/auth', () => ({
  auth: async () => (state.userId ? { user: { id: state.userId } } : null),
}))
vi.mock('@/lib/email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/email')>()
  return { ...actual, sendVerificationEmail: vi.fn(async () => {}) }
})

import { PrismaClient } from '@prisma/client'
import { signFunnelToken, FUNNEL_COOKIE_NAME } from '@/lib/funnelSession'
import { POST as giftClaim } from '@/app/api/gift/[code]/route'
import { POST as startComplete } from '@/app/api/start/complete/route'
import { POST as register } from '@/app/api/register/route'

const prisma = new PrismaClient()
const pid = process.pid

let sharerId: string
let claimantA: string
let claimantB: string

async function makeUser(email: string, extra: Record<string, unknown> = {}) {
  const u = await prisma.user.create({ data: { email, ...extra } })
  return u
}

function giftReq(code: string, userId: string) {
  state.userId = userId
  return giftClaim(
    new NextRequest(`http://localhost/api/gift/${code}`, { method: 'POST' }),
    { params: Promise.resolve({ code }) }
  )
}

beforeAll(async () => {
  sharerId = (await makeUser(`race-sharer-${pid}@test.local`, { credits: 0 })).id
  claimantA = (await makeUser(`race-a-${pid}@test.local`, { credits: 0, isAdmin: false, emailVerified: true })).id
  claimantB = (await makeUser(`race-b-${pid}@test.local`, { credits: 0, isAdmin: false, emailVerified: true })).id
})

afterAll(async () => {
  // Users cascade-delete their rows (claims, readings, master sessions...).
  await prisma.user.deleteMany({ where: { email: { contains: `-${pid}@test.local` } } })
  await prisma.giftLink.deleteMany({ where: { createdBy: { contains: `race-${pid}` } } }).catch(() => {})
  await prisma.shareLink.deleteMany({ where: { code: { startsWith: `race${pid}` } } })
  await prisma.$disconnect()
})

describe('gift claim race (maxClaims guard)', () => {
  it('two concurrent claims on a 1-slot link → exactly one winner, no overflow', async () => {
    const link = await prisma.giftLink.create({
      data: {
        code: `race${pid}g1`,
        credits: 5,
        maxClaims: 1,
        claimCount: 0,
        createdBy: `race-${pid}-admin`,
        enabled: true,
      },
    })

    const [resA, resB] = await Promise.all([
      giftReq(link.code, claimantA),
      giftReq(link.code, claimantB),
    ])

    const statuses = [resA.status, resB.status].sort()
    expect(statuses).toEqual([200, 400]) // one success, one refusal

    const after = await prisma.giftLink.findUniqueOrThrow({ where: { id: link.id } })
    expect(after.claimCount).toBe(1) // never exceeds maxClaims

    const [ua, ub] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: claimantA }, select: { credits: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: claimantB }, select: { credits: true } }),
    ])
    expect(ua.credits + ub.credits).toBe(5) // exactly one grant of 5
  })
})

describe('start/complete conversion race (tentative guard)', () => {
  it('two concurrent conversions → register bonus granted exactly once', async () => {
    const tentative = await prisma.user.create({
      data: { email: `race-tent-${pid}@test.local`, credits: 1, tentative: true, isAdmin: false },
    })
    await prisma.adminSetting.upsert({
      where: { key: 'registerBonus' },
      create: { key: 'registerBonus', value: '6' },
      update: { value: '6' },
    })

    const cookie = `${FUNNEL_COOKIE_NAME}=${signFunnelToken(tentative.id).value}; Path=/`
    const makeReq = () => new NextRequest('http://localhost/api/start/complete', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'Passw0rd123' }),
    })

    const [r1, r2] = await Promise.all([startComplete(makeReq()), startComplete(makeReq())])
    expect([r1.status, r2.status]).toEqual([200, 200]) // both treated as success...

    const body1 = await r1.json()
    const body2 = await r2.json()
    const conversions = [body1, body2].filter((b) => !b.alreadyCompleted)
    expect(conversions).toHaveLength(1) // ...but only one actually converted

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: tentative.id },
      select: { credits: true, tentative: true },
    })
    expect(after.tentative).toBe(false)
    expect(after.credits).toBe(1 + 6) // trial + single bonus
  })
})

describe('register referral race (used-flag guard)', () => {
  it('two concurrent signups with one referral code → sharer credited once', async () => {
    const shareLink = await prisma.shareLink.create({
      data: {
        userId: sharerId,
        code: `race${pid}ref`,
        used: false,
      },
    })

    const makeReq = (n: number) => new NextRequest('http://localhost/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `race-ref-${n}-${pid}@test.local`,
        password: 'Passw0rd123',
        referralCode: shareLink.code,
      }),
    })

    const [r1, r2] = await Promise.all([register(makeReq(1)), register(makeReq(2))])
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(201)

    const after = await prisma.shareLink.findUniqueOrThrow({ where: { id: shareLink.id } })
    expect(after.used).toBe(true)

    const sharer = await prisma.user.findUniqueOrThrow({ where: { id: sharerId }, select: { credits: true } })
    // Share bonus granted at most once (default 3; the guard is what matters,
    // so assert against a single grant of whatever the setting is).
    const bonusSetting = await prisma.adminSetting.findUnique({ where: { key: 'shareBonus' } })
    const bonus = parseInt(bonusSetting?.value ?? '3', 10) || 3
    expect(sharer.credits).toBe(bonus)
  })
})
