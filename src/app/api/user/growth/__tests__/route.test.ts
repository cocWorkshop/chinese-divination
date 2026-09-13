import { describe, it, expect, vi, beforeEach } from 'vitest'

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
    reading: {
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import { GET } from '../route'

describe('GET /api/user/growth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 404 if user not found', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } })
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('User not found')
  })

  it('returns growth profile for valid user', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1' } })
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      usageDivination: 10,
      usageMaster: 5,
      usageChat: 3,
      createdAt: new Date('2026-01-01'),
    })
    prismaMock.reading.groupBy.mockResolvedValue([
      { type: 'bazi', _count: { id: 6 } },
      { type: 'ziwei', _count: { id: 4 } },
    ])

    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()

    // 10 * 50 = 500
    // 5 * 20 = 100
    // 3 * 10 = 30
    // Total XP = 630 (Tier 3: 300 to 650)
    expect(json.xp).toBe(630)
    expect(json.tier).toBe(3)
    expect(json.currentRealm.title.zh).toContain('三阶 · 洞察阴阳')
    expect(json.breakdown.divination.count).toBe(10)
    expect(json.breakdown.master.count).toBe(5)
    expect(json.breakdown.chat.count).toBe(3)
    expect(json.achievements).toBeDefined()
    expect(json.achievements.length).toBeGreaterThan(0)
  })
})
