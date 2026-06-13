/**
 * Credit reservation (I5) + reading lifecycle (I9) integration tests.
 * Runs against the dev database (like the other integration suites).
 *
 * The contract under test (architecture plan Phase 2 verification):
 *   - N parallel holds against a 1-reading balance → exactly 1 succeeds,
 *     N−1 clean refusals, balance NEVER negative.
 *   - markFailed refunds the hold exactly once (idempotent, race-safe).
 *   - cleanupStaleReadings fails + refunds stuck pending readings.
 *   - a completed reading's hold is never refunded.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { holdCredits, getCost } from '@/lib/rateLimit'
import { markCompleted, markFailed, refundHold, cleanupStaleReadings } from '@/lib/readings/lifecycle'

const TEST_EMAIL = `test-credit-reservation-${process.pid}@test.local`
let userId: string
let cost: number

function makeReading(data: Partial<{ creditsHeld: number; status: string; createdAt: Date }> = {}) {
  return prisma.reading.create({
    data: {
      userId,
      type: 'meihua',
      status: data.status ?? 'pending',
      inputData: {},
      result: '',
      creditsHeld: data.creditsHeld ?? 0,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    },
  })
}

async function balance(): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } })
  return u?.credits ?? -999
}

beforeAll(async () => {
  cost = await getCost('meihua')
  expect(cost).toBeGreaterThan(0)
  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, credits: cost, isAdmin: false },
  })
  userId = user.id
})

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  await prisma.$disconnect()
})

describe('credit reservation', () => {
  it('N parallel holds on a 1-reading balance → exactly 1 succeeds, balance never negative', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => holdCredits(userId, 'meihua'))
    )
    const successes = results.filter((r) => r.held)
    expect(successes).toHaveLength(1)
    expect(successes[0].amount).toBe(cost)
    expect(await balance()).toBe(0)
  })

  it('markFailed refunds the hold exactly once, even when called twice', async () => {
    const reading = await makeReading({ creditsHeld: cost })
    await markFailed(reading.id, { reason: 'test failure' })
    expect(await balance()).toBe(cost)
    // Second markFailed must NOT double-refund.
    await markFailed(reading.id, { reason: 'test failure again' })
    expect(await balance()).toBe(cost)
    const row = await prisma.reading.findUnique({ where: { id: reading.id } })
    expect(row?.status).toBe('failed')
    expect(row?.creditsHeld).toBe(0)
    // restore: zero the balance for the next test
    await prisma.user.update({ where: { id: userId }, data: { credits: 0 } })
  })

  it('concurrent refunds of one hold pay out once (single-winner)', async () => {
    const reading = await makeReading({ creditsHeld: cost, status: 'failed' })
    const refunds = await Promise.all([refundHold(reading.id), refundHold(reading.id), refundHold(reading.id)])
    expect(refunds.reduce((a, b) => a + b, 0)).toBe(cost)
    expect(await balance()).toBe(cost)
    await prisma.user.update({ where: { id: userId }, data: { credits: 0 } })
  })

  it('cleanupStaleReadings fails + refunds stuck pending readings, leaves fresh ones', async () => {
    const stale = await makeReading({ creditsHeld: cost, createdAt: new Date(Date.now() - 20 * 60 * 1000) })
    const fresh = await makeReading({ creditsHeld: 0 })
    await cleanupStaleReadings()
    const staleRow = await prisma.reading.findUnique({ where: { id: stale.id } })
    const freshRow = await prisma.reading.findUnique({ where: { id: fresh.id } })
    expect(staleRow?.status).toBe('failed')
    expect(staleRow?.creditsHeld).toBe(0)
    expect(freshRow?.status).toBe('pending')
    expect(await balance()).toBe(cost)
    await prisma.user.update({ where: { id: userId }, data: { credits: 0 } })
  })

  it('a completed reading keeps its hold (= payment) — markFailed/refund are no-ops', async () => {
    const reading = await makeReading({ creditsHeld: cost })
    await markCompleted(reading.id, { result: '{"sections":{"overview":"ok"}}' })
    await markFailed(reading.id, { reason: 'should not apply' })
    expect(await refundHold(reading.id)).toBe(0)
    const row = await prisma.reading.findUnique({ where: { id: reading.id } })
    expect(row?.status).toBe('completed')
    expect(row?.creditsHeld).toBe(cost)
    expect(await balance()).toBe(0)
  })
})
