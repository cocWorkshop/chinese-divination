import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock, rateLimitMock, llmMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    siteFeedback: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    familyMember: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    reading: {
      findFirst: vi.fn(),
    },
  },
  rateLimitMock: vi.fn(),
  llmMock: {
    completeLLM: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/rateLimiter', () => ({
  rateLimit: (...args: any[]) => rateLimitMock(...args),
}))

vi.mock('@/lib/llm', () => ({
  completeLLM: (...args: any[]) => llmMock.completeLLM(...args),
}))

import { POST as siteFeedbackPost } from '../site-feedback/route'
import { DELETE as familyMembersDelete } from '../family-members/route'
import { POST as annualFortunePost } from '../readings/[id]/annual-fortune/route'

describe('New Route Hardening & Rate Limiting Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.mockReturnValue(true)
  })

  describe('POST /api/site-feedback', () => {
    it('rejects unauthenticated requests with 401', async () => {
      authMock.mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost:3000/api/site-feedback', {
        method: 'POST',
        body: JSON.stringify({ feedback: 'Good app' }),
      })
      const res = await siteFeedbackPost(req)
      expect(res.status).toBe(401)
    })

    it('blocks rate-limited users with 429', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u_spammer' } })
      rateLimitMock.mockReturnValueOnce(false)
      const req = new NextRequest('http://localhost:3000/api/site-feedback', {
        method: 'POST',
        body: JSON.stringify({ feedback: 'Spam' }),
      })
      const res = await siteFeedbackPost(req)
      expect(res.status).toBe(429)
      expect(rateLimitMock).toHaveBeenCalledWith('site-feedback:u_spammer', 5, 60000)
    })

    it('rejects empty feedback with 400', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      const req = new NextRequest('http://localhost:3000/api/site-feedback', {
        method: 'POST',
        body: JSON.stringify({ feedback: '   ' }),
      })
      const res = await siteFeedbackPost(req)
      expect(res.status).toBe(400)
    })

    it('persists valid feedback with sanitized fields', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.siteFeedback.create.mockResolvedValueOnce({ id: 'fb_123' })
      const req = new NextRequest('http://localhost:3000/api/site-feedback', {
        method: 'POST',
        body: JSON.stringify({ rating: 5, feedback: 'Wonderful experience!' }),
      })
      const res = await siteFeedbackPost(req)
      expect(res.status).toBe(200)
      expect(prismaMock.siteFeedback.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          rating: 5,
          feedback: 'Wonderful experience!',
        },
      })
    })
  })

  describe('DELETE /api/family-members', () => {
    it('returns 400 on missing or invalid ID', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      const req = new NextRequest('http://localhost:3000/api/family-members', {
        method: 'DELETE',
        body: JSON.stringify({ id: '' }),
      })
      const res = await familyMembersDelete(req)
      expect(res.status).toBe(400)
    })

    it('handles malformed JSON body safely without 500 crash', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      const req = new NextRequest('http://localhost:3000/api/family-members', {
        method: 'DELETE',
        body: 'NOT_VALID_JSON{',
      })
      const res = await familyMembersDelete(req)
      expect(res.status).toBe(400)
    })

    it('prevents IDOR deletion of another user member', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u_attacker' } })
      prismaMock.familyMember.findFirst.mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost:3000/api/family-members', {
        method: 'DELETE',
        body: JSON.stringify({ id: 'victim_member_id' }),
      })
      const res = await familyMembersDelete(req)
      expect(res.status).toBe(404)
      expect(prismaMock.familyMember.findFirst).toHaveBeenCalledWith({
        where: { id: 'victim_member_id', userId: 'u_attacker' },
      })
    })
  })

  describe('POST /api/readings/[id]/annual-fortune', () => {
    it('enforces rate limiting on authenticated users with 429', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u_heavy_caller' } })
      rateLimitMock.mockReturnValueOnce(false)
      const req = new NextRequest('http://localhost:3000/api/readings/r1/annual-fortune', {
        method: 'POST',
        body: JSON.stringify({
          type: 'bazi',
          decadeIndex: 0,
          decadeInfo: { startYear: 2020, endYear: 2029, startAge: 20, endAge: 29 },
        }),
      })
      const res = await annualFortunePost(req, { params: Promise.resolve({ id: 'r1' }) })
      expect(res.status).toBe(429)
      expect(rateLimitMock).toHaveBeenCalledWith('annual-fortune:u_heavy_caller', 10, 60000)
    })
  })
})
