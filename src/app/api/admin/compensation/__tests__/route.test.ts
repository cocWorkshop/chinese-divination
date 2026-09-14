import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  requireAdminMock,
  llmLogFindManyMock,
  frontendErrorFindManyMock,
  userFindManyMock,
  compensationFindManyMock,
  compensationCreateMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  llmLogFindManyMock: vi.fn(),
  frontendErrorFindManyMock: vi.fn(),
  userFindManyMock: vi.fn(),
  compensationFindManyMock: vi.fn(),
  compensationCreateMock: vi.fn(),
}))

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: requireAdminMock,
}))

vi.mock('@/lib/email', () => ({
  generateToken: () => 'mock-token-123',
  tokenExpiry: () => new Date('2026-10-01T00:00:00Z'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    llmLog: { findMany: llmLogFindManyMock },
    frontendError: { findMany: frontendErrorFindManyMock },
    user: { findMany: userFindManyMock },
    compensation: {
      findMany: compensationFindManyMock,
      count: vi.fn().mockResolvedValue(0),
      create: compensationCreateMock,
    },
  },
}))

import { GET, POST } from '../route'
import { isPseudoError } from '../utils'

describe('Compensation Route - Affected Users & Dismissal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue({ error: null, user: { id: 'admin-1', isAdmin: true } })
    compensationFindManyMock.mockResolvedValue([])
    userFindManyMock.mockResolvedValue([
      { id: 'u1', email: 'pseudo@example.com', name: 'User One' },
      { id: 'u2', email: 'real@example.com', name: 'User Two' },
    ])
  })

  describe('isPseudoError helper', () => {
    it('detects 429 status code as pseudo error', () => {
      expect(isPseudoError('Some error', 429)).toBe(true)
    })

    it('detects karma / credit exhaustion keywords', () => {
      expect(isPseudoError('✨ 機緣不足（需要 3，剩餘 0）')).toBe(true)
      expect(isPseudoError('机缘不足，请充值')).toBe(true)
      expect(isPseudoError('Not enough Karma (need 3, have 0)')).toBe(true)
      expect(isPseudoError('insufficient credits for chat')).toBe(true)
      expect(isPseudoError('額度不足')).toBe(true)
    })

    it('does not flag real server or model errors', () => {
      expect(isPseudoError('Internal Server Error 500', 500)).toBe(false)
      expect(isPseudoError('OpenRouter rate limit exceeded', 503)).toBe(false)
      expect(isPseudoError('JSON parse failed in bazi handler')).toBe(false)
    })
  })

  describe('GET ?action=affected-users', () => {
    it('filters out users who only have pseudo-errors (e.g. insufficient credits)', async () => {
      llmLogFindManyMock.mockResolvedValue([
        { id: 'l1', userId: 'u1', endpoint: 'divination', errorMessage: '✨ 機緣不足', createdAt: new Date() },
        { id: 'l2', userId: 'u2', endpoint: 'master', errorMessage: 'Gateway Timeout 504', createdAt: new Date() },
      ])
      frontendErrorFindManyMock.mockResolvedValue([
        { id: 'f1', userId: 'u1', endpoint: '/api/divination/init', error: '✨ 機緣不足（需要 3）', status: 429, createdAt: new Date() },
      ])

      const req = new NextRequest('http://localhost:3000/api/admin/compensation?action=affected-users')
      const res = await GET(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      // u1 has only pseudo-errors, so only u2 should be in affected list
      expect(data.affected).toHaveLength(1)
      expect(data.affected[0].user.email).toBe('real@example.com')
      expect(data.affected[0].llmErrors).toHaveLength(1)
      expect(data.affected[0].frontendErrors).toHaveLength(0)
    })

    it('excludes users who have already been dismissed', async () => {
      compensationFindManyMock.mockResolvedValue([
        { email: 'real@example.com' },
      ])
      llmLogFindManyMock.mockResolvedValue([
        { id: 'l2', userId: 'u2', endpoint: 'master', errorMessage: 'Gateway Timeout 504', createdAt: new Date() },
      ])
      frontendErrorFindManyMock.mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/admin/compensation?action=affected-users')
      const res = await GET(req)
      const data = await res.json()

      expect(data.affected).toHaveLength(0)
    })
  })

  describe('POST action: dismiss', () => {
    it('creates a dismissed compensation record so the user is excluded from affected list', async () => {
      compensationCreateMock.mockResolvedValue({
        id: 'comp-dismiss-1',
        email: 'pseudo@example.com',
        status: 'dismissed',
      })

      const req = new NextRequest('http://localhost:3000/api/admin/compensation', {
        method: 'POST',
        body: JSON.stringify({
          action: 'dismiss',
          email: 'pseudo@example.com',
          userId: 'u1',
          reason: '管理員忽略（額度用盡偽報錯）',
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)

      expect(compensationCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'pseudo@example.com',
          userId: 'u1',
          status: 'dismissed',
          sourceType: 'dismissed',
        }),
      })
    })
  })
})
