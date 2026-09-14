import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock, rateLimitMock, emailMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    creditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    notificationRead: {
      upsert: vi.fn(),
    },
    reading: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    readingFeedback: {
      upsert: vi.fn(),
    },
  },
  rateLimitMock: vi.fn(),
  emailMock: {
    generateToken: vi.fn(() => 'mock-token-xyz'),
    tokenExpiry: vi.fn((_hours?: number) => new Date(Date.now() + 86400000)),
    sendVerificationEmail: vi.fn(),
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

vi.mock('@/lib/email', () => ({
  generateToken: () => emailMock.generateToken(),
  tokenExpiry: (hours?: number) => emailMock.tokenExpiry(hours),
  sendVerificationEmail: (email: string, token: string, lang?: string, origin?: string) =>
    emailMock.sendVerificationEmail(email, token, lang, origin),
}))

import { POST as resendVerificationPost } from '../resend-verification/route'
import { GET as creditsHistoryGet } from '../credits/history/route'
import { POST as notificationReadPost } from '../notifications/[id]/read/route'
import { POST as feedbackPost } from '../readings/[id]/feedback/route'

describe('route hardening regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.mockReturnValue(true)
  })

  describe('/api/resend-verification', () => {
    it('returns 400 when email is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/resend-verification', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const res = await resendVerificationPost(req)
      expect(res.status).toBe(400)
    })

    it('returns 429 when IP rate limit is exceeded', async () => {
      rateLimitMock.mockReturnValueOnce(false)

      const req = new NextRequest('http://localhost:3000/api/resend-verification', {
        method: 'POST',
        headers: { 'x-forwarded-for': '1.2.3.4' },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const res = await resendVerificationPost(req)
      expect(res.status).toBe(429)
    })

    it('returns generic message without leaking user existence when user not found or verified', async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      })

      const res = await resendVerificationPost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toContain('If the account exists')
      expect(emailMock.sendVerificationEmail).not.toHaveBeenCalled()
    })

    it('sends verification email for unverified user and returns generic message', async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce({
        id: 'u1',
        emailVerified: null,
        language: 'zh-TW',
      })
      prismaMock.user.update.mockResolvedValueOnce({})

      const req = new NextRequest('http://localhost:3000/api/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: 'unverified@example.com' }),
      })

      const res = await resendVerificationPost(req)
      expect(res.status).toBe(200)
      expect(emailMock.sendVerificationEmail).toHaveBeenCalledWith(
        'unverified@example.com',
        'mock-token-xyz',
        'zh-TW',
        expect.anything()
      )
    })
  })

  describe('/api/credits/history', () => {
    it('returns 401 when unauthenticated', async () => {
      authMock.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/credits/history')
      const res = await creditsHistoryGet(req)
      expect(res.status).toBe(401)
    })

    it('clamps invalid/huge page and limit parameters to safe bounds', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.creditLog.findMany.mockResolvedValueOnce([])
      prismaMock.creditLog.count.mockResolvedValueOnce(50)

      const req = new NextRequest('http://localhost:3000/api/credits/history?page=-5&limit=999999')
      const res = await creditsHistoryGet(req)

      expect(res.status).toBe(200)
      expect(prismaMock.creditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        skip: 0, // page clamped to 1 -> skip 0
        take: 100, // limit clamped to 100
      })
    })
  })

  describe('/api/notifications/[id]/read', () => {
    it('returns 401 when unauthenticated', async () => {
      authMock.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/notifications/n1/read', { method: 'POST' })
      const res = await notificationReadPost(req, { params: { id: 'n1' } })
      expect(res.status).toBe(401)
    })

    it('catches FK violation and returns 404', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.notificationRead.upsert.mockRejectedValueOnce(new Error('Foreign key violation'))

      const req = new NextRequest('http://localhost:3000/api/notifications/n_fake/read', { method: 'POST' })
      const res = await notificationReadPost(req, { params: { id: 'n_fake' } })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Notification not found')
    })
  })

  describe('/api/readings/[id]/feedback', () => {
    it('returns 400 when rating is out of 1-5 range', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })

      const req = new NextRequest('http://localhost:3000/api/readings/r1/feedback', {
        method: 'POST',
        body: JSON.stringify({ rating: 10 }),
      })

      const res = await feedbackPost(req, { params: Promise.resolve({ id: 'r1' }) })
      expect(res.status).toBe(400)
    })

    it('returns 404 when reading does not belong to user (IDOR prevention)', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u_attacker' } })
      prismaMock.reading.findFirst.mockResolvedValueOnce(null)

      const req = new NextRequest('http://localhost:3000/api/readings/r1/feedback', {
        method: 'POST',
        body: JSON.stringify({ rating: 5 }),
      })

      const res = await feedbackPost(req, { params: Promise.resolve({ id: 'r1' }) })
      expect(res.status).toBe(404)
      expect(prismaMock.reading.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', userId: 'u_attacker', deletedAt: null },
        select: { id: true },
      })
    })

    it('caps feedback length to 2000 chars on upsert', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.reading.findFirst.mockResolvedValueOnce({ id: 'r1' })
      prismaMock.readingFeedback.upsert.mockResolvedValueOnce({ rating: 5, feedback: 'ok' })
      prismaMock.reading.update.mockResolvedValueOnce({})

      const longFeedback = 'A'.repeat(3000)
      const req = new NextRequest('http://localhost:3000/api/readings/r1/feedback', {
        method: 'POST',
        body: JSON.stringify({ rating: 5, feedback: longFeedback }),
      })

      const res = await feedbackPost(req, { params: Promise.resolve({ id: 'r1' }) })
      expect(res.status).toBe(200)

      expect(prismaMock.readingFeedback.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            feedback: 'A'.repeat(2000),
          }),
          update: expect.objectContaining({
            feedback: 'A'.repeat(2000),
          }),
        })
      )
    })
  })
})
