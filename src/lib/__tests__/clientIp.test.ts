import { describe, it, expect } from 'vitest'
import { getClientIp } from '../clientIp'

describe('getClientIp', () => {
  it('extracts leftmost IP from x-forwarded-for with multiple hops', () => {
    const req = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      },
    })
    expect(getClientIp(req)).toBe('203.0.113.195')
  })

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = new Request('https://example.com', {
      headers: {
        'x-real-ip': '198.51.100.1',
      },
    })
    expect(getClientIp(req)).toBe('198.51.100.1')
  })

  it('returns null when no IP headers are present', () => {
    const req = new Request('https://example.com')
    expect(getClientIp(req)).toBeNull()
  })
})
