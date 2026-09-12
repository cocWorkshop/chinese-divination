import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { requireAdminMock, readingFindManyMock, readingCountMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  readingFindManyMock: vi.fn(),
  readingCountMock: vi.fn(),
}))

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: requireAdminMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    reading: {
      findMany: readingFindManyMock,
      count: readingCountMock,
    },
  },
}))

import { GET } from '../route'

describe('GET /api/admin/readings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue({ error: null, user: { id: 'admin-1', isAdmin: true } })
    readingFindManyMock.mockResolvedValue([])
    readingCountMock.mockResolvedValue(0)
  })

  it('rejects unauthenticated requests', async () => {
    requireAdminMock.mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      user: null,
    })

    const req = new NextRequest('http://localhost:3000/api/admin/readings')
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(readingFindManyMock).not.toHaveBeenCalled()
  })

  it('returns readings with pagination and default filters', async () => {
    readingFindManyMock.mockResolvedValue([
      { id: 'r1', type: 'bazi', user: { email: 'user1@example.com' } },
    ])
    readingCountMock.mockResolvedValue(1)

    const req = new NextRequest('http://localhost:3000/api/admin/readings?page=1&limit=20')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.readings).toHaveLength(1)
    expect(data.total).toBe(1)
    expect(readingFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        skip: 0,
        take: 20,
      })
    )
  })

  it('filters by user email (case-insensitive substring) when email param is supplied', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/readings?email=test@example.com')
    await GET(req)

    expect(readingFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          user: {
            email: {
              contains: 'test@example.com',
              mode: 'insensitive',
            },
          },
        }),
      })
    )
    expect(readingCountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          user: {
            email: {
              contains: 'test@example.com',
              mode: 'insensitive',
            },
          },
        }),
      })
    )
  })

  it('filters by user email when search param is supplied', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/readings?search=vip_user')
    await GET(req)

    expect(readingFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          user: {
            email: {
              contains: 'vip_user',
              mode: 'insensitive',
            },
          },
        }),
      })
    )
  })
})
