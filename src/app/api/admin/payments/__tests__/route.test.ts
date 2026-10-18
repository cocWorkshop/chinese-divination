import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from '../route'

const {
  requireAdminMock,
  paymentRecordFindManyMock,
  paymentRecordCountMock,
  paymentRecordAggregateMock,
  userCountMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  paymentRecordFindManyMock: vi.fn(),
  paymentRecordCountMock: vi.fn(),
  paymentRecordAggregateMock: vi.fn(),
  userCountMock: vi.fn(),
}))

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: requireAdminMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentRecord: {
      findMany: paymentRecordFindManyMock,
      count: paymentRecordCountMock,
      aggregate: paymentRecordAggregateMock,
    },
    user: {
      count: userCountMock,
    },
  },
}))

describe('GET /api/admin/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects non-admin requests', async () => {
    requireAdminMock.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })

    const req = new NextRequest('http://localhost:3000/api/admin/payments')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns payment list with stats for admin', async () => {
    requireAdminMock.mockResolvedValueOnce({
      error: null,
      user: { id: 'admin_1', isAdmin: true },
    })

    const mockPayments = [
      {
        id: 'pmt_1',
        stripeSessionId: 'cs_123',
        amount: 891,
        currency: 'usd',
        credits: 100,
        status: 'completed',
        createdAt: new Date('2026-10-18T00:00:00Z'),
        user: {
          id: 'u1',
          email: 'user@example.com',
          name: 'Patron',
          isPaid: true,
          paidAt: new Date('2026-10-18T00:00:00Z'),
        },
      },
    ]

    paymentRecordFindManyMock.mockResolvedValueOnce(mockPayments)
    paymentRecordCountMock.mockResolvedValueOnce(1)
    paymentRecordAggregateMock.mockResolvedValueOnce({
      _sum: { amount: 891 },
    })
    userCountMock.mockResolvedValueOnce(1)

    const req = new NextRequest('http://localhost:3000/api/admin/payments?page=1&limit=20&search=Patron')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.total).toBe(1)
    expect(json.payments).toHaveLength(1)
    expect(json.stats.totalRevenue).toBe(891)
    expect(json.stats.totalPaidUsers).toBe(1)
  })
})
