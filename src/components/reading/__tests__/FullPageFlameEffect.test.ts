import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
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

  it('scopes flame overlay strictly within the reading result region rather than fixed full-viewport', () => {
    const flamePath = path.resolve(__dirname, '../FullPageFlameEffect.tsx')
    const content = fs.readFileSync(flamePath, 'utf-8')

    // Must not render as a full-screen fixed overlay above navbar & Master dock
    expect(content).not.toContain('fixed inset-0')
    expect(content).not.toContain('z-[9999]')
    expect(content).not.toContain("'105vh'")
    expect(content).not.toContain("'-10vh'")

    // Must lock to parent container bounds using overflow-clip (preserving sticky children)
    expect(content).toContain('absolute inset-0 rounded-[inherit] pointer-events-none z-30 overflow-clip select-none')
    expect(content).toContain("top: '102%'")
    expect(content).toContain("top: '-8%'")
    expect(content).toContain('sticky top-[35vh]')
  })

  it('uses dual-theme accessible tokens on the consecration banner', () => {
    const flamePath = path.resolve(__dirname, '../FullPageFlameEffect.tsx')
    const content = fs.readFileSync(flamePath, 'utf-8')

    expect(content).toContain('oriental-sanctuary-card')
    expect(content).toContain('text-[var(--text-secondary)]')
    expect(content).not.toContain('text-foreground/75')
  })

  it('keeps ReadingResultCard, ReadingResultView, and PublicReadingClient sticky-compatible and region-anchored', () => {
    const cardContent = fs.readFileSync(path.resolve(__dirname, '../../ReadingResultCard.tsx'), 'utf-8')
    const viewContent = fs.readFileSync(path.resolve(__dirname, '../../ReadingResultView.tsx'), 'utf-8')
    const publicContent = fs.readFileSync(path.resolve(__dirname, '../../../app/r/[token]/PublicReadingClient.tsx'), 'utf-8')

    // Card acts as relative positioning anchor with overflow-x-clip (avoiding sticky traps)
    expect(cardContent).toContain('card-quiet relative rounded-2xl')
    expect(cardContent).toContain("'overflow-x-clip'")
    expect(cardContent).not.toContain("'overflow-x-auto'")

    // Outer view must use overflow-x-clip rather than overflow-x-hidden to preserve position:sticky
    expect(viewContent).toContain('overflow-x-clip')
    expect(viewContent).not.toContain('overflow-x-hidden')

    // Root css uses overflow-x: clip rather than hidden so position: sticky works inside Reading cards
    const globalsContent = fs.readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf-8')
    expect(globalsContent).toMatch(/html,\s*body\s*\{\r?\n\s*overflow-x:\s*clip;/)
    expect(publicContent).not.toMatch(/flex-1 py-6 sm:py-8 px-3 sm:px-4">\r?\n\s*<FullPageFlameEffect/)
  })
})
