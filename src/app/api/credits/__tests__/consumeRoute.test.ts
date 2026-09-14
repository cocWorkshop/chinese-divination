import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock, deductCreditsMock, getCostMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditLog: {
      create: vi.fn(),
    },
  },
  deductCreditsMock: vi.fn(),
  getCostMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/creditService', () => ({
  deductCredits: (...args: any[]) => deductCreditsMock(...args),
  getCost: (...args: any[]) => getCostMock(...args),
}))

import { POST } from '../consume/route'

describe('POST /api/credits/consume (Karma Deduction & Decadal Gating Rule)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if user is not authenticated', async () => {
    authMock.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost:8088/api/credits/consume', {
      method: 'POST',
      body: JSON.stringify({ type: 'dayun_unlock', decadeIndex: 3 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toContain('Unauthorized')
  })

  it('successfully deducts Karma credit for dayun_unlock when user has enough credits', async () => {
    authMock.mockResolvedValueOnce({
      user: { id: 'user_123', email: 'test@xuanji.ai' },
    })
    getCostMock.mockResolvedValueOnce(1)
    deductCreditsMock.mockResolvedValueOnce(true)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      credits: 9,
      isAdmin: false,
    })

    const req = new NextRequest('http://localhost:8088/api/credits/consume', {
      method: 'POST',
      body: JSON.stringify({
        type: 'dayun_unlock',
        decadeIndex: 3,
        readingId: 'reading_abc',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.remaining).toBe(9)
    expect(json.deducted).toBe(1)
    expect(deductCreditsMock).toHaveBeenCalledWith(
      'user_123',
      'dayun_unlock',
      expect.stringContaining('大運解鎖')
    )
  })

  it('returns 402 if user has insufficient Karma credits', async () => {
    authMock.mockResolvedValueOnce({
      user: { id: 'user_123', email: 'test@xuanji.ai' },
    })
    getCostMock.mockResolvedValueOnce(1)
    deductCreditsMock.mockResolvedValueOnce(false)
    prismaMock.user.findUnique.mockResolvedValueOnce({
      credits: 0,
      isAdmin: false,
    })

    const req = new NextRequest('http://localhost:8088/api/credits/consume', {
      method: 'POST',
      body: JSON.stringify({
        type: 'dayun_unlock',
        decadeIndex: 4,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error).toBe('INSUFFICIENT_CREDITS')
    expect(json.message).toContain('機緣點不足')
    expect(json.remaining).toBe(0)
    expect(json.cost).toBe(1)
  })
})
