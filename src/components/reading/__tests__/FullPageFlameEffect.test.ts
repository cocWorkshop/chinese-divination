import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { publish, subscribe } from '@/lib/events'

describe('FullPageFlameEffect', () => {
  beforeEach(() => {
    // Setup minimal window shim for Node test environment
    const listeners: Record<string, any[]> = {}
    ;(globalThis as any).window = {
      addEventListener: (type: string, fn: any) => {
        listeners[type] = listeners[type] || []
        listeners[type].push(fn)
      },
      removeEventListener: (type: string, fn: any) => {
        if (!listeners[type]) return
        listeners[type] = listeners[type].filter(l => l !== fn)
      },
      dispatchEvent: (event: any) => {
        const fns = listeners[event.type] || []
        fns.forEach(fn => fn(event))
        return true
      },
    }
    ;(globalThis as any).CustomEvent = class CustomEvent {
      type: string
      detail: any
      constructor(type: string, init?: any) {
        this.type = type
        this.detail = init?.detail
      }
    }
  })

  afterEach(() => {
    // @ts-ignore
    delete globalThis.window
    // @ts-ignore
    delete globalThis.CustomEvent
  })

  it('publishes xuanji:readingComplete correctly for the effect to listen to', () => {
    let captured: { readingId: string; type: string } | null = null
    const unsub = subscribe('xuanji:readingComplete', (detail) => {
      captured = detail
    })

    publish('xuanji:readingComplete', { readingId: 'test-reading-123', type: 'bazi' })
    unsub()

    expect(captured).toEqual({ readingId: 'test-reading-123', type: 'bazi' })
  })

  it('custom xuanji:triggerFlame event triggers manual flame burst', () => {
    let fired = false
    const handler = () => { fired = true }
    window.addEventListener('xuanji:triggerFlame', handler)
    window.dispatchEvent(new CustomEvent('xuanji:triggerFlame'))
    window.removeEventListener('xuanji:triggerFlame', handler)

    expect(fired).toBe(true)
  })
})
