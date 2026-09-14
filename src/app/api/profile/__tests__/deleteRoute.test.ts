import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock, emailMock, bcryptMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    authLog: {
      deleteMany: vi.fn(),
    },
    llmLog: {
      deleteMany: vi.fn(),
    },
    siteFeedback: {
      create: vi.fn(),
    },
  },
  emailMock: {
    generateToken: vi.fn(() => 'del_token_abc'),
    tokenExpiry: vi.fn(() => new Date(Date.now() + 86400000)),
    sendDeleteConfirmationEmail: vi.fn(),
  },
  bcryptMock: {
    compare: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('bcryptjs', () => ({
  compare: (p: string, h: string) => bcryptMock.compare(p, h),
}))

vi.mock('@/lib/email', () => ({
  generateToken: () => emailMock.generateToken(),
  tokenExpiry: () => emailMock.tokenExpiry(),
  sendDeleteConfirmationEmail: (...args: any[]) => emailMock.sendDeleteConfirmationEmail(...args),
}))

vi.mock('@/lib/authLog', () => ({
  logAuth: vi.fn(),
}))

import { DELETE as deleteRequest } from '../delete/route'
import { POST as confirmDelete } from '../delete/confirm/route'

describe('account deletion security & GDPR compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DELETE /api/profile/delete', () => {
    it('returns 401 if unauthenticated', async () => {
      authMock.mockResolvedValueOnce(null)
      const req = new NextRequest('http://localhost:3000/api/profile/delete', {
        method: 'DELETE',
        body: JSON.stringify({ password: 'any' }),
      })
      const res = await deleteRequest(req)
      expect(res.status).toBe(401)
    })

    it('requires and verifies password for credentials accounts', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'usr_cred' } })
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'usr_cred',
        email: 'user@example.com',
        password: 'hashed_password',
      })
      bcryptMock.compare.mockResolvedValueOnce(false)

      const req = new NextRequest('http://localhost:3000/api/profile/delete', {
        method: 'DELETE',
        body: JSON.stringify({ password: 'wrong_password' }),
      })
      const res = await deleteRequest(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Invalid password')
    })

    it('allows OAuth users without password to initiate deletion', async () => {
      authMock.mockResolvedValueOnce({ user: { id: 'usr_oauth' } })
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'usr_oauth',
        email: 'oauth@gmail.com',
        password: null, // OAuth-only account
        language: 'zh-TW',
      })
      prismaMock.user.update.mockResolvedValueOnce({} as any)
      emailMock.sendDeleteConfirmationEmail.mockResolvedValueOnce(undefined)

      const req = new NextRequest('http://localhost:3000/api/profile/delete', {
        method: 'DELETE',
        body: JSON.stringify({}),
      })
      const res = await deleteRequest(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'usr_oauth' },
        data: expect.objectContaining({
          deleteToken: 'del_token_abc',
        }),
      })
      expect(emailMock.sendDeleteConfirmationEmail).toHaveBeenCalledWith(
        'oauth@gmail.com',
        'del_token_abc',
        'zh-TW',
        undefined
      )
    })
  })

  describe('POST /api/profile/delete/confirm', () => {
    it('cascade deletes auth logs, LLM logs, and user row upon confirmation', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'usr_to_delete',
        email: 'delete_me@example.com',
        deleteTokenExpiry: new Date(Date.now() + 3600000),
      })
      prismaMock.authLog.deleteMany.mockResolvedValueOnce({ count: 2 } as any)
      prismaMock.llmLog.deleteMany.mockResolvedValueOnce({ count: 15 } as any)
      prismaMock.user.delete.mockResolvedValueOnce({ id: 'usr_to_delete' } as any)

      const req = new NextRequest('http://localhost:3000/api/profile/delete/confirm', {
        method: 'POST',
        headers: { 'x-forwarded-for': '192.0.2.1' },
        body: JSON.stringify({ token: 'valid_token_123' }),
      })

      const res = await confirmDelete(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)

      // Verifies GDPR Art. 17 compliance: LLM chat & divination logs are pruned
      expect(prismaMock.llmLog.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'usr_to_delete' },
      })
      expect(prismaMock.authLog.deleteMany).toHaveBeenCalledWith({
        where: { email: 'delete_me@example.com' },
      })
      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'usr_to_delete' },
      })
    })
  })
})
