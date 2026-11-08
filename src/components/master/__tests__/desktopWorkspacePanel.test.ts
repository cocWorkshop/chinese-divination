import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Desktop Split-Screen Sanctuary Workspace (Design A)', () => {
  it('MainContent should apply responsive right margins and transition on desktop workspace routes', () => {
    const mainContentPath = path.resolve(__dirname, '../../MainContent.tsx')
    const content = fs.readFileSync(mainContentPath, 'utf-8')

    // Workspace route detection
    expect(content).toContain("pathname?.startsWith('/divination') || pathname?.startsWith('/reading')")
    // Only applies when expanded
    expect(content).toContain("isWorkspace && shape === 'expanded'")
    // Responsive desktop margin classes (440px -> 480px -> 520px)
    expect(content).toContain('lg:mr-[440px] xl:mr-[480px] 2xl:mr-[520px]')
    // Smooth transition
    expect(content).toContain('transition-all duration-300 ease-out')
    // Mobile is untouched (< lg has no breakpoint-unqualified mr classes)
    expect(content).not.toMatch(/\s+mr-\[\d+px\]/)
  })

  it('ExpandedView should dock as an inline right panel on desktop workspace routes and hide desktop backdrop', () => {
    const expandedViewPath = path.resolve(__dirname, '../widget/ExpandedView.tsx')
    const content = fs.readFileSync(expandedViewPath, 'utf-8')

    // Detect workspace
    expect(content).toContain("pathname?.startsWith('/divination') || pathname?.startsWith('/reading')")
    // Desktop docking classes
    expect(content).toContain('lg:top-16 lg:bottom-0 lg:right-0 lg:left-auto lg:w-[440px] xl:w-[480px] 2xl:w-[520px] lg:z-30 lg:p-0 lg:block')
    // Hide dark backdrop on desktop so left side remains interactive
    expect(content).toContain("isWorkspace ? 'lg:hidden' : ''")
    // Inner card styling: left gold border, full height on desktop
    expect(content).toContain('lg:w-full lg:max-w-none lg:h-full lg:rounded-none lg:border-l lg:border-t-0 lg:border-r-0 lg:border-b-0 lg:border-[rgba(212,168,83,0.25)]')
    // Collapse button tooltip indicates collapsing master panel
    expect(content).toContain("isWorkspace ? T(lang, '收起大師面板', 'Collapse Master panel')")
  })

  it('DivinationPage should adapt cards to 2 columns and hide bottom dock when expanded', () => {
    const pagePath = path.resolve(__dirname, '../../../app/divination/page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    // Checks shape from useMasterChat
    expect(content).toContain('useMasterChat')
    expect(content).toContain("isExpanded = shape === 'expanded'")
    // Cards grid toggles: 2 columns when expanded vs 3 columns on desktop when collapsed
    expect(content).toContain("isExpanded ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'")
    // MasterEntryCard dock is hidden when expanded
    expect(content).toContain('!isExpanded &&')
    expect(content).toContain('<MasterEntryCard />')
  })

  it('Footer should shift synchronously with MainContent on desktop when expanded in workspace', () => {
    const footerPath = path.resolve(__dirname, '../../Footer.tsx')
    const content = fs.readFileSync(footerPath, 'utf-8')

    // Shifts by matching desktop margin classes
    expect(content).toContain("isExpandedDesktop ? 'lg:mr-[440px] xl:mr-[480px] 2xl:mr-[520px]' : ''")
    expect(content).toContain('transition-all duration-300 ease-out')
  })

  it('InContextMasterPrompt should dispatch immediate sends when user asks a suggested reading question', () => {
    const promptPath = path.resolve(__dirname, '../../reading/InContextMasterPrompt.tsx')
    const content = fs.readFileSync(promptPath, 'utf-8')

    expect(content).toContain('sendMessage(promptText, { immediate: true })')
  })
})
