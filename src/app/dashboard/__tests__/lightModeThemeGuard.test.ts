import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Dashboard & Growth System Dual-Theme (Light / Dark Mode) Integrity Guard', () => {
  const dashboardPath = path.resolve(__dirname, '../page.tsx')
  const growthTabPath = path.resolve(__dirname, '../../profile/_tabs/GrowthTab.tsx')
  const profilePagePath = path.resolve(__dirname, '../../profile/page.tsx')

  it('never hardcodes dark-navy gradients or muddy dark-on-gold inline #000 styles on the Dashboard', () => {
    const content = fs.readFileSync(dashboardPath, 'utf-8')

    // Regression: rgba(10,17,40,0.6) painted an ugly dark slate smear across the Growth Ribbon in Light Mode
    expect(content).not.toContain('rgba(10,17,40')
    expect(content).not.toContain('rgba(10, 17, 40')

    // Regression: `background: 'var(--gold)', color: '#000'` produced muddy dark-ochre-on-black pills in Light Mode
    expect(content).not.toContain("color: '#000'")
    expect(content).not.toContain("background: !activeTypeFilter ? 'var(--gold)'")
    expect(content).not.toContain("background: active ? 'var(--gold)'")
    expect(content).not.toContain("backgroundColor: 'var(--gold)'")
  })

  it('uses dual-theme Oriental Sanctuary surface for the Growth Ribbon, luminous gold leaf for New Reading CTA, and translucent gold wash for active filter pills', () => {
    const content = fs.readFileSync(dashboardPath, 'utf-8')

    // Growth ribbon uses theme-aware oriental-sanctuary-card
    expect(content).toContain('oriental-sanctuary-card relative overflow-hidden mb-4 p-3.5 sm:p-4 rounded-xl')
    // Primary CTA (+ 新占卜) uses luminous gold leaf gradient + crisp dark ink + PlusIcon
    expect(content).toContain('<PlusIcon size={13} />')
    expect(content).toContain('from-[#e5bf69] via-[#f0d38c] to-[#d4a853]')
    // Active filter chips ("全部" & type chips) use soft gold tint wash + crisp gold border
    expect(content).toContain('bg-gold/15 dark:bg-gold/20 border-gold text-gold font-semibold shadow-sm ring-1 ring-gold/25')
  })

  it('keeps GrowthTab hero seal and Master Xuanji reflection free of hardcoded dark backgrounds in Light Mode', () => {
    const content = fs.readFileSync(growthTabPath, 'utf-8')
    const profileContent = fs.readFileSync(profilePagePath, 'utf-8')

    expect(content).not.toContain('rgba(10,17,40')
    expect(content).not.toContain('rgba(0,0,0,0.6)')
    expect(content).toContain('bg-gold/10 dark:bg-black/40 text-gold')

    // Profile tab bar also avoids muddy bg-gold text-navy-950 on light mode
    expect(profileContent).not.toContain('bg-gold text-navy-950 shadow-md shadow-gold/10')
    expect(profileContent).toContain('bg-gradient-to-r from-[#e5bf69] via-[#f0d38c] to-[#d4a853]')
  })
})
