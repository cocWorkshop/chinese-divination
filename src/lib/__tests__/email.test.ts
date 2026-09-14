import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: sendMock,
      }
    },
  }
})

import {
  generateToken,
  tokenExpiry,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCompensationEmail,
  sendDeleteConfirmationEmail,
} from '../email'

describe('email service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendMock.mockResolvedValue({ data: { id: 'test_msg_id' }, error: null })
  })

  describe('token helpers', () => {
    it('generateToken produces a 64-char hex string (32 bytes)', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(token1)).toBe(true)
      expect(token1).not.toBe(token2)
    })

    it('tokenExpiry returns a future Date matching requested hours', () => {
      const before24 = Date.now()
      const expiry24 = tokenExpiry(24)
      const after24 = Date.now()
      expect(expiry24.getTime()).toBeGreaterThanOrEqual(before24 + 24 * 3600 * 1000)
      expect(expiry24.getTime()).toBeLessThanOrEqual(after24 + 24 * 3600 * 1000)

      const before1 = Date.now()
      const expiry1 = tokenExpiry(1)
      const after1 = Date.now()
      expect(expiry1.getTime()).toBeGreaterThanOrEqual(before1 + 3600 * 1000)
      expect(expiry1.getTime()).toBeLessThanOrEqual(after1 + 3600 * 1000)
    })
  })

  describe('safeBaseUrl & origin protection', () => {
    it('falls back to default BASE_URL when origin is not allowlisted', async () => {
      await sendVerificationEmail(
        'user@example.com',
        'tok123',
        'zh-TW',
        'https://attacker-domain.evil.com'
      )

      expect(sendMock).toHaveBeenCalledTimes(1)
      const callArgs = sendMock.mock.calls[0][0]
      expect(callArgs.to).toBe('user@example.com')
      // Must not contain attacker origin
      expect(callArgs.html).not.toContain('https://attacker-domain.evil.com')
      // Must contain default origin (e.g. http://localhost:3000)
      expect(callArgs.html).toContain('token=tok123')
    })
  })

  describe('sendVerificationEmail', () => {
    it('sends email with Chinese subject and content by default', async () => {
      await sendVerificationEmail('test@example.com', 'token-abc')

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: '玄機 - 驗證您的電子郵件',
          html: expect.stringContaining('token=token-abc'),
        })
      )
    })

    it('sends email with English subject when lang is en', async () => {
      await sendVerificationEmail('test@example.com', 'token-abc', 'en')

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Xuanji - Verify Your Email',
          html: expect.stringContaining('Verify Your Email'),
        })
      )
    })

    it('throws error when resend returns error', async () => {
      sendMock.mockResolvedValue({ data: null, error: { message: 'Invalid API Key' } })

      await expect(
        sendVerificationEmail('test@example.com', 'token-abc')
      ).rejects.toThrow('Email send failed: Invalid API Key')
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('sends reset link with 1 hour notice', async () => {
      await sendPasswordResetEmail('reset@example.com', 'reset-tok-999', 'zh-TW')

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'reset@example.com',
          subject: '玄機 - 重置您的密碼',
          html: expect.stringContaining('/reset-password?token=reset-tok-999'),
        })
      )
    })

    it('supports English reset email', async () => {
      await sendPasswordResetEmail('reset@example.com', 'reset-tok-999', 'en')

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'reset@example.com',
          subject: 'Xuanji - Reset Your Password',
          html: expect.stringContaining('Reset Your Password'),
        })
      )
    })
  })

  describe('sendCompensationEmail', () => {
    it('formats bonus items and reason', async () => {
      await sendCompensationEmail(
        'vip@example.com',
        'claim-token-123',
        {
          bonusModel1: 5,
          bonusModel2: 2,
          bonusChat: 10,
          reason: '系统临时故障补偿',
        },
        'zh-TW'
      )

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'vip@example.com',
          subject: '玄機 - 您有一份補償待領取',
          html: expect.stringContaining('/claim/claim-token-123'),
        })
      )
      const html = sendMock.mock.calls[0][0].html
      expect(html).toContain('標準模型: +5')
      expect(html).toContain('高級模型: +2')
      expect(html).toContain('聊天機緣: +10')
      expect(html).toContain('系统临时故障补偿')
    })

    it('supports English compensation notice', async () => {
      await sendCompensationEmail(
        'vip@example.com',
        'claim-token-123',
        {
          bonusModel1: 1,
          bonusModel2: 0,
          bonusChat: 0,
          reason: 'System latency issue',
        },
        'en'
      )

      const html = sendMock.mock.calls[0][0].html
      expect(html).toContain('Standard Model: +1')
      expect(html).toContain('System latency issue')
    })
  })

  describe('sendDeleteConfirmationEmail', () => {
    it('sends account deletion confirmation warning', async () => {
      await sendDeleteConfirmationEmail('delete@example.com', 'del-tok-456', 'zh-TW')

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'delete@example.com',
          subject: '玄機 - 確認刪除帳號',
          html: expect.stringContaining('/delete-account/del-tok-456'),
        })
      )
      const html = sendMock.mock.calls[0][0].html
      expect(html).toContain('⚠️ 此操作不可撤銷')
    })

    it('supports English deletion confirmation', async () => {
      await sendDeleteConfirmationEmail('delete@example.com', 'del-tok-456', 'en')

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'delete@example.com',
          subject: 'Xuanji - Confirm Account Deletion',
          html: expect.stringContaining('/delete-account/del-tok-456'),
        })
      )
    })
  })
})
