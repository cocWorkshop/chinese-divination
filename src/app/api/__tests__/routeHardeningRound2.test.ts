import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock, rateLimitMock, stripeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    deviceToken: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    shareLink: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notificationRead: {
      upsert: vi.fn(),
    },
    adminSetting: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  rateLimitMock: vi.fn(),
  stripeMock: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
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

vi.mock('@/lib/stripe', () => ({
  stripe: stripeMock,
}))

vi.mock('@/lib/creditLogger', () => ({
  logCreditChange: vi.fn().mockResolvedValue(undefined),
}))

import { POST as registerDevicePost, DELETE as registerDeviceDelete } from '../notifications/register-device/route'
import { POST as shareClaimPost } from '../share/claim/route'
import { POST as stripeCheckoutPost } from '../stripe/checkout/route'
import { POST as notificationReadPost } from '../notifications/[id]/read/route'

describe('Route Hardening Round 2 & Next.js 15 Async Params', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.mockReturnValue(true)
  })

  describe('POST /api/notifications/register-device', () => {
    it('returns 401 when unauthorized', async () => {
      authMock.mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost:3000/api/notifications/register-device', {
        method: 'POST',
        body: JSON.stringify({ token: 'device-token-1234567890', platform: 'ios' }),
      })
      const res = await registerDevicePost(req)
      expect(res.status).toBe(401)
    })

    it('returns 429 when rate limited', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      rateLimitMock.mockReturnValueOnce(false)
      const req = new NextRequest('http://localhost:3000/api/notifications/register-device', {
        method: 'POST',
        body: JSON.stringify({ token: 'device-token-1234567890', platform: 'ios' }),
      })
      const res = await registerDevicePost(req)
      expect(res.status).toBe(429)
    })

    it('rejects invalid platform with 400', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      const req = new NextRequest('http://localhost:3000/api/notifications/register-device', {
        method: 'POST',
        body: JSON.stringify({ token: 'device-token-1234567890', platform: 'windows' }),
      })
      const res = await registerDevicePost(req)
      expect(res.status).toBe(400)
    })

    it('upserts device token successfully', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.deviceToken.upsert.mockResolvedValueOnce({ id: 'dt1' })

      const req = new NextRequest('http://localhost:3000/api/notifications/register-device', {
        method: 'POST',
        body: JSON.stringify({ token: 'device-token-1234567890', platform: 'ios' }),
      })
      const res = await registerDevicePost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(prismaMock.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_token: { userId: 'u1', token: 'device-token-1234567890' } },
        })
      )
    })

    it('DELETE deactivates device token', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.deviceToken.updateMany.mockResolvedValueOnce({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/notifications/register-device', {
        method: 'DELETE',
        body: JSON.stringify({ token: 'device-token-1234567890' }),
      })
      const res = await registerDeviceDelete(req)
      expect(res.status).toBe(200)
      expect(prismaMock.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', token: 'device-token-1234567890' },
        data: { active: false },
      })
    })
  })

  describe('POST /api/share/claim', () => {
    it('returns 429 when rate limited', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      rateLimitMock.mockReturnValueOnce(false)

      const req = new NextRequest('http://localhost:3000/api/share/claim', {
        method: 'POST',
        body: JSON.stringify({ code: 'SHARE123' }),
      })
      const res = await shareClaimPost(req)
      expect(res.status).toBe(429)
    })

    it('rejects short / invalid code with 400', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      const req = new NextRequest('http://localhost:3000/api/share/claim', {
        method: 'POST',
        body: JSON.stringify({ code: 'x' }),
      })
      const res = await shareClaimPost(req)
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/stripe/checkout', () => {
    it('returns 429 when rate limited', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      rateLimitMock.mockReturnValueOnce(false)

      const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ packId: 'pack_standard' }),
      })
      const res = await stripeCheckoutPost(req)
      expect(res.status).toBe(429)
    })

    it('rejects invalid pack with 400', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      const req = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ packId: 'invalid_pack_xyz' }),
      })
      const res = await stripeCheckoutPost(req)
      expect(res.status).toBe(400)
    })
  })

  describe('Next.js 15 Async Params Support', () => {
    it('accepts Promise<{ id: string }> in notification read route', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
      prismaMock.notificationRead.upsert.mockResolvedValueOnce({})

      const req = new NextRequest('http://localhost:3000/api/notifications/n123/read', { method: 'POST' })
      const res = await notificationReadPost(req, { params: Promise.resolve({ id: 'n123' }) })
      expect(res.status).toBe(200)
      expect(prismaMock.notificationRead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_notificationId: { userId: 'u1', notificationId: 'n123' } },
        })
      )
    })
  })
})
