import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, prismaMock, completeLLMMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    reading: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  completeLLMMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/llm', () => ({
  completeLLM: (...args: any[]) => completeLLMMock(...args),
}))

import { POST } from '../route'

describe('POST /api/readings/:id/annual-fortune', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 if unauthenticated', async () => {
    authMock.mockResolvedValueOnce(null)
    const req = new NextRequest('http://localhost:8088/api/readings/r1/annual-fortune', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bazi',
        decadeIndex: 0,
        decadeInfo: { startYear: 2025, endYear: 2034, startAge: 25, endAge: 34 },
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 if reading is not found or not owned by user', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
    prismaMock.reading.findFirst.mockResolvedValueOnce(null)

    const req = new NextRequest('http://localhost:8088/api/readings/r1/annual-fortune', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bazi',
        decadeIndex: 0,
        decadeInfo: { startYear: 2025, endYear: 2034, startAge: 25, endAge: 34 },
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(404)
  })

  it('returns cached fortunes if already present in reading.result', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
    const cachedFortunes = [
      { year: 2025, age: 25, ganZhi: '乙巳', theme: '木火通明', fortune: '吉星高照' },
    ]
    prismaMock.reading.findFirst.mockResolvedValueOnce({
      id: 'r1',
      userId: 'u1',
      result: JSON.stringify({
        detailedAnnualFortunes: {
          decade_0: cachedFortunes,
        },
      }),
    })

    const req = new NextRequest('http://localhost:8088/api/readings/r1/annual-fortune', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bazi',
        decadeIndex: 0,
        decadeInfo: { startYear: 2025, endYear: 2034, startAge: 25, endAge: 34 },
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.cached).toBe(true)
    expect(json.fortunes).toEqual(cachedFortunes)
    expect(completeLLMMock).not.toHaveBeenCalled()
  })

  it('calls completeLLM and persists new fortunes when not cached', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u1' } })
    const baseResult = {
      pillars: { year: { stem: '甲', branch: '子' } },
      liuNian: [
        { year: 2025, age: 25, stem: '乙', branch: '巳', tenGod: '正官' },
      ],
    }
    prismaMock.reading.findFirst.mockResolvedValueOnce({
      id: 'r1',
      userId: 'u1',
      result: JSON.stringify(baseResult),
    })

    const generated = [
      {
        year: 2025,
        age: 25,
        ganZhi: '乙巳',
        theme: '官印相生',
        fortune: '今年运势通达，适合晋升开拓。',
        career: '事业稳健',
        wealth: '财运亨通',
        romance: '人际和睦',
        health: '气血充足',
        interaction: '岁运生扶',
        advice: '见机行事',
      },
    ]

    completeLLMMock.mockResolvedValueOnce({
      content: JSON.stringify(generated),
    })
    prismaMock.reading.update.mockResolvedValueOnce({})

    const req = new NextRequest('http://localhost:8088/api/readings/r1/annual-fortune', {
      method: 'POST',
      body: JSON.stringify({
        type: 'bazi',
        decadeIndex: 0,
        decadeInfo: { startYear: 2025, endYear: 2034, startAge: 25, endAge: 34, stem: '丙', branch: '午' },
      }),
    })

    const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.cached).toBe(false)
    expect(json.fortunes).toHaveLength(1)
    expect(json.fortunes[0].ganZhi).toBe('乙巳')
    expect(prismaMock.reading.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({
        result: expect.stringContaining('detailedAnnualFortunes'),
      }),
    })
  })
})
