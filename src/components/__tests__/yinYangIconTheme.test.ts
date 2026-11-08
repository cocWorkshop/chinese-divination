import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('YinYangIcon & MysticalLoader Dual-Theme Visual Integrity', () => {
  it('YinYangIcon should NOT contain the washed-out fill-gold/15 in light mode', () => {
    const iconPath = path.resolve(__dirname, '../YinYangIcon.tsx')
    const content = fs.readFileSync(iconPath, 'utf-8')

    // Regression prevention: fill-gold/15 causes the Yin fish to vanish in light mode
    expect(content).not.toContain('fill-gold/15')
  })

  it('YinYangIcon provides distinct Yin contrast in both light (#23180c) and dark (navy-950) modes', () => {
    const iconPath = path.resolve(__dirname, '../YinYangIcon.tsx')
    const content = fs.readFileSync(iconPath, 'utf-8')

    // Base circle contains Dunhuang deep ink for light mode and navy-950 for dark mode
    expect(content).toContain('fill-[#23180c] dark:fill-navy-950')
  })

  it('YinYangIcon places correct reciprocal eye colors (Yang eye in Yin fish, Yin eye in Yang fish)', () => {
    const iconPath = path.resolve(__dirname, '../YinYangIcon.tsx')
    const content = fs.readFileSync(iconPath, 'utf-8')

    // Eye at (50, 26) is inside the Yin fish -> must be filled with stroke (Gold)
    expect(content).toContain('<circle cx="50" cy="26" r="6.5" fill={stroke} />')

    // Eye at (50, 74) is inside the Yang fish -> must be filled with Yin dark color
    expect(content).toContain('<circle\n        cx="50"\n        cy="74"\n        r="6.5"\n        className="fill-[#23180c] dark:fill-navy-950"')
  })

  it('yinYangSvgDataUri has correctly aligned reciprocal eye fills', () => {
    const iconPath = path.resolve(__dirname, '../YinYangIcon.tsx')
    const content = fs.readFileSync(iconPath, 'utf-8')

    expect(content).toContain('cx="50" cy="26" r="6.5" fill="%23d4a853"')
    expect(content).toContain('cx="50" cy="74" r="6.5" fill="%230a0f1e"')
  })

  it('MysticalLoader uses dual-theme drop-shadows and readable trigram contrast', () => {
    const loaderPath = path.resolve(__dirname, '../MysticalLoader.tsx')
    const content = fs.readFileSync(loaderPath, 'utf-8')

    // Subtle physical shadow in light mode, golden glow in dark mode
    expect(content).toContain('drop-shadow-[0_4px_20px_rgba(45,31,14,0.18)] dark:drop-shadow-[0_0_24px_rgba(212,168,83,0.5)]')

    // High-contrast trigram symbols for light mode
    expect(content).toContain('text-gold-dark/85 dark:text-gold/85 font-serif select-none drop-shadow-sm')
  })
})
