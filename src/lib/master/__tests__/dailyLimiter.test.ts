import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkMasterDailyLimit, getDayStart, DEFAULT_MASTER_DAILY_TURN_LIMIT } from '../dailyLimiter'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
    adminSetting: {
      findUnique: vi.fn(),
    },
    masterChatMessage: {
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

describe('dailyLimiter - getDayStart', () => {
  it('computes UTC day start when no timezone offset provided', () => {
    const start = getDayStart()
    expect(start.getUTCHours()).toBe(0)
    expect(start.getUTCMinutes()).toBe(0)
    expect(start.getUTCSeconds()).toBe(0)
  })

  it('computes local day start considering timezone offset (e.g. UTC+8 => -480)', () => {
    const start = getDayStart(-480)
    expect(start).toBeInstanceOf(Date)
  })
})

describe('dailyLimiter - checkMasterDailyLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows user when daily count is below the limit', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false })
    prismaMock.adminSetting.findUnique.mockResolvedValue(null)
    prismaMock.masterChatMessage.count.mockResolvedValue(10)

    const res = await checkMasterDailyLimit('u1', 'zh-TW')

    expect(res.allowed).toBe(true)
    expect(res.maxLimit).toBe(DEFAULT_MASTER_DAILY_TURN_LIMIT)
    expect(res.count).toBe(10)
    expect(res.remaining).toBe(20)
    expect(res.message).toBeUndefined()
  })

  it('blocks user and returns graceful message when limit is reached', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: false })
    prismaMock.adminSetting.findUnique.mockResolvedValue({ value: '25' })
    prismaMock.masterChatMessage.count.mockResolvedValue(25)

    const resZh = await checkMasterDailyLimit('u1', 'zh-TW')

    expect(resZh.allowed).toBe(false)
    expect(resZh.maxLimit).toBe(25)
    expect(resZh.remaining).toBe(0)
    expect(resZh.message).toContain('道友今日探討天機已深')

    const resEn = await checkMasterDailyLimit('u1', 'en')
    expect(resEn.allowed).toBe(false)
    expect(resEn.message).toContain('explored the workings of fate deeply today')
  })

  it('bypasses limit for admin users', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ isAdmin: true })
    prismaMock.adminSetting.findUnique.mockResolvedValue({ value: '10' })

    const res = await checkMasterDailyLimit('admin_1', 'zh-TW')

    expect(res.allowed).toBe(true)
    expect(res.remaining).toBe(999)
    expect(prismaMock.masterChatMessage.count).not.toHaveBeenCalled()
  })
})
