import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'

const { authMock, paymentRecordFindManyMock, userFindUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  paymentRecordFindManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentRecord: {
      findMany: paymentRecordFindManyMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
  },
}))

describe('GET /api/user/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if unauthenticated', async () => {
    authMock.mockResolvedValueOnce(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns payment records and paid status for authenticated user', async () => {
    authMock.mockResolvedValueOnce({
      user: { id: 'usr_123', email: 'test@example.com' },
    })

    const now = new Date('2026-10-18T00:00:00Z')
    paymentRecordFindManyMock.mockResolvedValueOnce([
      {
        id: 'pmt_1',
        stripeSessionId: 'cs_test_123',
        packId: 'pack100',
        amount: 891,
        currency: 'usd',
        credits: 100,
        status: 'completed',
        note: null,
        createdAt: now,
      },
      {
        id: 'pmt_2',
        stripeSessionId: 'cs_test_456',
        packId: 'pack10',
        amount: 199,
        currency: 'usd',
        credits: 10,
        status: 'refunded',
        note: null,
        createdAt: now,
      },
    ])

    userFindUniqueMock.mockResolvedValueOnce({
      isPaid: true,
      paidAt: now,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.isPaid).toBe(true)
    expect(json.paidAt).toBe(now.toISOString())
    expect(json.totalSpent).toBe(891) // only completed counted
    expect(json.payments).toHaveLength(2)
    expect(paymentRecordFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'usr_123' },
      })
    )
  })
})
