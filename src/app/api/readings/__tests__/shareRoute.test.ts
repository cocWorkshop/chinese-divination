import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    reading: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import { POST, DELETE } from '../[id]/share/route'

describe('share route (/api/readings/[id]/share)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST (create or get share token)', () => {
    it('returns 401 when unauthorized', async () => {
      authMock.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/readings/r1/share', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when reading is not found or deleted', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.reading.findFirst.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/readings/r1/share', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })

      expect(res.status).toBe(404)
      expect(prismaMock.reading.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', userId: 'u1', deletedAt: null },
        select: { id: true, shareToken: true },
      })
    })

    it('returns existing shareToken if already generated', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.reading.findFirst.mockResolvedValueOnce({
        id: 'r1',
        shareToken: 'existingToken123',
      })

      const req = new NextRequest('http://localhost:3000/api/readings/r1/share', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.token).toBe('existingToken123')
      expect(prismaMock.reading.update).not.toHaveBeenCalled()
    })

    it('generates a new token and saves it if reading has no shareToken', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.reading.findFirst.mockResolvedValueOnce({
        id: 'r1',
        shareToken: null,
      })
      prismaMock.reading.update.mockResolvedValueOnce({})

      const req = new NextRequest('http://localhost:3000/api/readings/r1/share', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(typeof data.token).toBe('string')
      expect(data.token.length).toBe(12)
      expect(prismaMock.reading.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { shareToken: data.token },
      })
    })
  })

  describe('DELETE (revoke share token - P5)', () => {
    it('returns 401 when unauthorized', async () => {
      authMock.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/readings/r1/share', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'r1' }) })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('revokes active share link and returns revoked: true', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.reading.updateMany.mockResolvedValueOnce({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/readings/r1/share', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'r1' }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.revoked).toBe(true)

      expect(prismaMock.reading.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'r1',
          userId: 'u1',
          deletedAt: null,
          shareToken: { not: null },
        },
        data: { shareToken: null },
      })
    })

    it('returns revoked: false idempotently when token was already revoked or not found', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.reading.updateMany.mockResolvedValueOnce({ count: 0 })

      const req = new NextRequest('http://localhost:3000/api/readings/r1/share', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'r1' }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.revoked).toBe(false)
    })
  })
})
