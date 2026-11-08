import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('ModalShell Component Architecture & Safety Guards', () => {
  it('ModalShell does not mutate window.history directly to prevent React 18/Next.js popstate self-destruction', () => {
    const modalShellPath = path.resolve(__dirname, '../ModalShell.tsx')
    const content = fs.readFileSync(modalShellPath, 'utf-8')

    // Must NOT contain direct window.history.pushState or window.history.back in effects
    expect(content).not.toContain('window.history.pushState')
    expect(content).not.toContain('window.history.back')

    // Must rely on registerOverlay for clean LIFO overlay stack management
    expect(content).toContain('registerOverlay(shellId, () => onCloseRef.current())')
    expect(content).toContain('restoreFocusRef.current?.focus?.()')

    // Must support Escape key and focus trap
    expect(content).toContain("e.key === 'Escape'")
    expect(content).toContain("e.key !== 'Tab'")
  })

  it('Start page integrates skip confirmation modal without unhandled history side effects', () => {
    const startPagePath = path.resolve(__dirname, '../../../app/start/page.tsx')
    const content = fs.readFileSync(startPagePath, 'utf-8')

    // Skip button exists
    expect(content).toContain("setShowSkipModal(true)")
    expect(content).toContain('暫不填寫，直接體驗 (跳過) →')

    // ModalShell is rendered with confirmation dialog
    expect(content).toContain('showSkipModal &&')
    expect(content).toContain('<ModalShell')
    expect(content).toContain('handleConfirmSkip')
    expect(content).toContain("changeStep('roadmap')")
  })
})
