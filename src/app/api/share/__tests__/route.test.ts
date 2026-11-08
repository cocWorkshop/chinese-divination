import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock, rateLimitMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    shareLink: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
  rateLimitMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/rateLimiter', () => ({
  rateLimit: (...args: unknown[]) => rateLimitMock(...args),
}))

import { POST } from '../route'

describe('Share Route (/api/share)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.mockReturnValue(true)
  })

  it('returns 401 with structured UNAUTHORIZED code when session is missing', async () => {
    authMock.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost:8088/api/share', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
    expect(json.error).toBe('Unauthorized')
    expect(json.message).toContain('請先登入')
  })

  it('reuses latest active unclaimed link when forceNew is false and active link exists', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'user_123' } })
    prismaMock.shareLink.findFirst.mockResolvedValueOnce({ code: 'active_code_abc' })

    const req = new NextRequest('http://localhost:8088/api/share', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.code).toBe('active_code_abc')
    expect(json.reused).toBe(true)
    expect(json.url).toContain('/share/active_code_abc')

    // Should not create a new link or consume rate limit
    expect(prismaMock.shareLink.create).not.toHaveBeenCalled()
    expect(rateLimitMock).not.toHaveBeenCalled()
  })

  it('creates a new share link when user has no active links', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'user_123' } })
    prismaMock.shareLink.findFirst.mockResolvedValueOnce(null)
    prismaMock.shareLink.count.mockResolvedValueOnce(0)
    prismaMock.shareLink.create.mockResolvedValueOnce({ id: 'new_id', code: 'generated_code' })

    const req = new NextRequest('http://localhost:8088/api/share', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.code).toHaveLength(16) // 8 random bytes in hex = 16 hex chars
    expect(json.reused).toBe(false)
    expect(rateLimitMock).toHaveBeenCalledWith('share-create:user_123', 10, 60000)
    expect(prismaMock.shareLink.create).toHaveBeenCalled()
  })

  it('creates a new share link when forceNew is true even if active link exists', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'user_123' } })
    prismaMock.shareLink.count.mockResolvedValueOnce(2)
    prismaMock.shareLink.create.mockResolvedValueOnce({ id: 'new_id', code: 'forced_code' })

    const req = new NextRequest('http://localhost:8088/api/share', {
      method: 'POST',
      body: JSON.stringify({ forceNew: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.reused).toBe(false)
    // findFirst for reuse must NOT have been called
    expect(prismaMock.shareLink.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.shareLink.create).toHaveBeenCalled()
  })

  it('auto-prunes oldest unclaimed links when activeCount >= 10 instead of blocking user', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'user_123' } })
    // Simulate user already having 12 unclaimed links from past usage
    prismaMock.shareLink.count.mockResolvedValueOnce(12)
    prismaMock.shareLink.findMany.mockResolvedValueOnce([
      { id: 'old_1' },
      { id: 'old_2' },
      { id: 'old_3' },
    ])
    prismaMock.shareLink.deleteMany.mockResolvedValueOnce({ count: 3 })
    prismaMock.shareLink.create.mockResolvedValueOnce({ id: 'new_id', code: 'new_code' })

    const req = new NextRequest('http://localhost:8088/api/share', {
      method: 'POST',
      body: JSON.stringify({ forceNew: true }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.reused).toBe(false)

    // prune count should be 12 - 10 + 1 = 3
    expect(prismaMock.shareLink.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_123', used: false },
      orderBy: { createdAt: 'asc' },
      take: 3,
      select: { id: true },
    })
    expect(prismaMock.shareLink.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old_1', 'old_2', 'old_3'] } },
    })
    expect(prismaMock.shareLink.create).toHaveBeenCalled()
  })

  it('returns 429 with RATE_LIMITED code when rateLimit fails', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'user_123' } })
    prismaMock.shareLink.findFirst.mockResolvedValueOnce(null)
    rateLimitMock.mockReturnValueOnce(false)

    const req = new NextRequest('http://localhost:8088/api/share', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.code).toBe('RATE_LIMITED')
    expect(json.error).toContain('Too many requests')
    expect(json.message).toContain('操作過於頻繁')
  })
})
