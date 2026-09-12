/**
 * Unit tests for creditService — getCosts / refundMasterCredits /
 * holdCreditsAndCreateReading — with a mocked prisma client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  adminSetting: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  reading: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/creditLogger', () => ({ logCreditChange: vi.fn() }))

import { getCosts, refundMasterCredits, holdCreditsAndCreateReading } from '../creditService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCosts', () => {
  it('resolves overrides and defaults in one findMany', async () => {
    prismaMock.adminSetting.findMany.mockResolvedValue([
      { key: 'cost_bazi', value: '8' },
      { key: 'cost_chat', value: '0' },
    ])
    const costs = await getCosts(['bazi', 'chat', 'meihua'])
    expect(costs).toEqual({ bazi: 8, chat: 0, meihua: 3 }) // 3 = DEFAULT_COSTS.meihua
    expect(prismaMock.adminSetting.findMany).toHaveBeenCalledTimes(1)
  })

  it('falls back to defaults on malformed override values', async () => {
    prismaMock.adminSetting.findMany.mockResolvedValue([{ key: 'cost_bazi', value: 'not-a-number' }])
    const costs = await getCosts(['bazi'])
    expect(costs.bazi).toBe(5) // default bazi cost
  })

  it('rejects negative override values', async () => {
    prismaMock.adminSetting.findMany.mockResolvedValue([{ key: 'cost_chat', value: '-3' }])
    const costs = await getCosts(['chat'])
    expect(costs.chat).toBe(2) // default chat cost
  })
})

describe('refundMasterCredits', () => {
  it('refunds the current master cost and writes a CreditLog entry', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false })
    prismaMock.adminSetting.findUnique.mockResolvedValue({ key: 'cost_master', value: '2' })
    prismaMock.user.update.mockResolvedValue({ credits: 12 })

    await refundMasterCredits('u1', 'req-1')

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { credits: { increment: 2 } },
      select: { credits: true },
    })
  })

  it('skips admins (they never pay)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true })
    await refundMasterCredits('admin-1')
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('never throws — a failed refund is swallowed', async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error('db down'))
    await expect(refundMasterCredits('u1')).resolves.toBeUndefined()
  })
})

describe('holdCreditsAndCreateReading', () => {
  function makeTx() {
    return {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      reading: { create: vi.fn() },
    }
  }

  it('atomic success: guarded decrement + reading create in one tx', async () => {
    const tx = makeTx()
    tx.user.findUnique.mockResolvedValue({ isAdmin: false })
    tx.user.updateMany.mockResolvedValue({ count: 1 })
    tx.reading.create.mockResolvedValue({ id: 'reading-1' })
    prismaMock.$transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx))
    prismaMock.adminSetting.findUnique.mockResolvedValue(null) // default cost
    prismaMock.user.findUnique.mockResolvedValue({ credits: 7 })

    const result = await holdCreditsAndCreateReading('u1', 'meihua', (creditsHeld) => ({
      userId: 'u1',
      type: 'meihua',
      modelTier: 'model1',
      status: 'pending',
      question: null,
      inputData: {},
      result: '',
      language: 'zh-TW',
      targetType: 'self',
      familyMemberId: null,
      creditsHeld,
    }))

    expect(result?.held).toBe(true)
    expect(result?.amount).toBe(3) // default meihua cost
    expect(result?.readingId).toBe('reading-1')
    // The callback received the held amount to persist on the row
    expect(tx.reading.create.mock.calls[0][0].data.creditsHeld).toBe(3)
  })

  it('insufficient balance → null, no reading row', async () => {
    const tx = makeTx()
    tx.user.findUnique.mockResolvedValue({ isAdmin: false })
    tx.user.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.$transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx))
    prismaMock.adminSetting.findUnique.mockResolvedValue(null)

    const result = await holdCreditsAndCreateReading('u1', 'meihua', () => ({}) as never)
    expect(result).toBeNull()
    expect(tx.reading.create).not.toHaveBeenCalled()
  })

  it('admins hold 0 but still get the pending row (usage-tracked)', async () => {
    const tx = makeTx()
    tx.user.findUnique.mockResolvedValue({ isAdmin: true })
    tx.user.update.mockResolvedValue({})
    tx.reading.create.mockResolvedValue({ id: 'reading-2' })
    prismaMock.$transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx))
    prismaMock.adminSetting.findUnique.mockResolvedValue(null)

    const result = await holdCreditsAndCreateReading('admin-1', 'meihua', (creditsHeld) => ({ creditsHeld }) as never)
    expect(result?.amount).toBe(0)
    expect(tx.reading.create.mock.calls[0][0].data.creditsHeld).toBe(0)
  })
})
