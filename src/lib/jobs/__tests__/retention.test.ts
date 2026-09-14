/**
 * Retention job unit tests — mocked prisma; verifies cutoff math, batched
 * deletes, dry-run mode, and the never-throws contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  llmLog: { count: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
  authLog: { count: vi.fn(), deleteMany: vi.fn() },
  masterChatMessage: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { runLogRetention } from '../logRetention'
import { runMasterChatRetention, resolveMasterChatRetentionDays } from '../masterChatRetention'

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.LOG_PURGE_DRY_RUN
  delete process.env.MASTER_CHAT_RETENTION_DRY_RUN
  delete process.env.MASTER_CHAT_RETENTION_DAYS
})

describe('runLogRetention', () => {
  it('scrubs LlmLog PII (90d), hard-deletes LlmLog (180d), deletes AuthLog (365d)', async () => {
    prismaMock.llmLog.updateMany.mockResolvedValue({ count: 5 })
    prismaMock.llmLog.deleteMany.mockResolvedValue({ count: 2 })
    prismaMock.authLog.deleteMany.mockResolvedValue({ count: 7 })

    await runLogRetention()

    const scrubWhere = prismaMock.llmLog.updateMany.mock.calls[0][0].where
    expect(scrubWhere.createdAt.lt).toBeInstanceOf(Date)
    // 90-day cutoff for scrubbing
    expect(Date.now() - scrubWhere.createdAt.lt.getTime()).toBeGreaterThan(89 * 86400_000)
    expect(Date.now() - scrubWhere.createdAt.lt.getTime()).toBeLessThan(91 * 86400_000)

    const deleteWhere = prismaMock.llmLog.deleteMany.mock.calls[0][0].where
    // 180-day cutoff for hard delete
    expect(Date.now() - deleteWhere.createdAt.lt.getTime()).toBeGreaterThan(179 * 86400_000)
    expect(Date.now() - deleteWhere.createdAt.lt.getTime()).toBeLessThan(181 * 86400_000)

    expect(prismaMock.authLog.deleteMany).toHaveBeenCalled()
  })

  it('dry run counts without writing', async () => {
    process.env.LOG_PURGE_DRY_RUN = '1'
    prismaMock.llmLog.count.mockResolvedValue(3)
    prismaMock.authLog.count.mockResolvedValue(1)

    await runLogRetention()

    expect(prismaMock.llmLog.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.llmLog.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.authLog.deleteMany).not.toHaveBeenCalled()
  })

  it('never throws on DB failure', async () => {
    prismaMock.llmLog.updateMany.mockRejectedValue(new Error('db down'))
    await expect(runLogRetention()).resolves.toBeUndefined()
  })
})

describe('runMasterChatRetention', () => {
  it('deletes only archived rows past the cutoff, in id batches', async () => {
    // Two full batches then a short one → 3 findMany / 3 deleteMany cycles.
    prismaMock.masterChatMessage.findMany
      .mockResolvedValueOnce(Array.from({ length: 5000 }, (_, i) => ({ id: `a${i}` })))
      .mockResolvedValueOnce(Array.from({ length: 5000 }, (_, i) => ({ id: `b${i}` })))
      .mockResolvedValueOnce([{ id: 'z1' }])
    prismaMock.masterChatMessage.deleteMany.mockResolvedValue({ count: 5000 })

    await runMasterChatRetention()

    expect(prismaMock.masterChatMessage.findMany).toHaveBeenCalledTimes(3)
    expect(prismaMock.masterChatMessage.deleteMany).toHaveBeenCalledTimes(3)

    const findArgs = prismaMock.masterChatMessage.findMany.mock.calls[0][0]
    expect(findArgs.take).toBe(5000)
    const where = findArgs.where
    expect(where.archivedAt.lt).toBeInstanceOf(Date)
    // default 180-day cutoff
    expect(Date.now() - where.archivedAt.lt.getTime()).toBeGreaterThan(179 * 86400_000)
    expect(Date.now() - where.archivedAt.lt.getTime()).toBeLessThan(181 * 86400_000)

    // deleteMany scoped to the fetched ids
    const delWhere = prismaMock.masterChatMessage.deleteMany.mock.calls[0][0].where
    expect(delWhere.id.in).toHaveLength(5000)
  })

  it('single small batch → one delete cycle', async () => {
    prismaMock.masterChatMessage.findMany.mockResolvedValueOnce([{ id: 'x1' }, { id: 'x2' }])
    prismaMock.masterChatMessage.deleteMany.mockResolvedValueOnce({ count: 2 })
    await runMasterChatRetention()
    expect(prismaMock.masterChatMessage.deleteMany).toHaveBeenCalledTimes(1)
  })

  it('respects MASTER_CHAT_RETENTION_DAYS env override', async () => {
    process.env.MASTER_CHAT_RETENTION_DAYS = '30'
    prismaMock.masterChatMessage.findMany.mockResolvedValue([])
    await runMasterChatRetention()
    const where = prismaMock.masterChatMessage.findMany.mock.calls[0][0].where
    expect(Date.now() - where.archivedAt.lt.getTime()).toBeGreaterThan(29 * 86400_000)
    expect(Date.now() - where.archivedAt.lt.getTime()).toBeLessThan(31 * 86400_000)
  })

  it('dry run counts without deleting', async () => {
    process.env.MASTER_CHAT_RETENTION_DRY_RUN = '1'
    prismaMock.masterChatMessage.count.mockResolvedValue(42)
    await runMasterChatRetention()
    expect(prismaMock.masterChatMessage.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.masterChatMessage.count).toHaveBeenCalled()
  })

  it('resolveMasterChatRetentionDays falls back to 180 on garbage input', () => {
    process.env.MASTER_CHAT_RETENTION_DAYS = 'not-a-number'
    expect(resolveMasterChatRetentionDays()).toBe(180)
    process.env.MASTER_CHAT_RETENTION_DAYS = '-5'
    expect(resolveMasterChatRetentionDays()).toBe(180)
  })

  it('never throws on DB failure', async () => {
    prismaMock.masterChatMessage.findMany.mockRejectedValue(new Error('db down'))
    await expect(runMasterChatRetention()).resolves.toBeUndefined()
  })
})
