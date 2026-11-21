import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('BaziResultV2 DaYun Strip & Annual Grid Border Clipping Guard', () => {
  const baziV2Path = path.resolve(__dirname, '../BaziResultV2.tsx')
  const ziweiV2Path = path.resolve(__dirname, '../ZiweiResultV2.tsx')

  it('gives the overflow-x-auto DaYun/DaXian strip generous top, bottom, and horizontal padding in both BaziResultV2 and ZiweiResultV2', () => {
    const baziContent = fs.readFileSync(baziV2Path, 'utf-8')
    const ziweiContent = fs.readFileSync(ziweiV2Path, 'utf-8')

    // Regression: `overflow-x-auto` forces `overflow-y: auto` in CSS; without top/side/bottom buffer,
    // `scale-105` + `ring-2` on selected DaYun/DaXian cards slices off top/left/right borders.
    expect(baziContent).toContain('overflow-x-auto scrollbar-hide -mx-2 px-2 pt-2.5 pb-2.5')
    expect(ziweiContent).toContain('overflow-x-auto scrollbar-hide -mx-2 px-2 pt-2.5 pb-2.5')
    // Regression: ZiWei must build a full 8-step DaXian list from deterministic decadalSiHua/palaces
    // so it never renders only 1 decade when LLM daYunAnalysis has 1 entry.
    expect(ziweiContent).toContain('const fullDaXianList: AnyData[] = useMemo')
    expect(ziweiContent).toContain('baseDecades.slice(0, 8)')
  })

  it('elevates the selected DaYun card above adjacent rings with z-10', () => {
    const content = fs.readFileSync(baziV2Path, 'utf-8')

    expect(content).toContain('border-gold ring-2 ring-gold/60 bg-gold/20 shadow-md scale-105 z-10')
  })

  it('provides clean padding and unified 10-column desktop layout around 10-year LiuNian grid in both BaziResultV2 and ZiweiResultV2', () => {
    const baziContent = fs.readFileSync(baziV2Path, 'utf-8')
    const ziweiContent = fs.readFileSync(ziweiV2Path, 'utf-8')

    expect(baziContent).toContain('grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2.5 pb-2.5 px-1.5')
    expect(ziweiContent).toContain('grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2.5 pb-2.5 px-1.5')

    // Regression: BaZi must stack Decade Overview and 10-Year Annual Fortunes full-width like ZiWei,
    // never trapping the 10-year grid and expanded year details inside a narrow md:col-span-7 side column.
    expect(baziContent).not.toContain('md:col-span-5')
    expect(baziContent).not.toContain('md:col-span-7')
  })

  it('places the BaZi DaYun & 10-year annual fortune section right before Key Predictions and removes the redundant Liu Nian Timeline strip', () => {
    const baziContent = fs.readFileSync(baziV2Path, 'utf-8')
    const ziweiContent = fs.readFileSync(ziweiV2Path, 'utf-8')

    const drawerEndIdx = baziContent.indexOf('</SectionDrawer>')
    const dayunIdx = baziContent.indexOf('═══ DA YUN & 10-YEAR ANNUAL FORTUNE ═══')
    const keyPredictionsIdx = baziContent.indexOf('═══ KEY PREDICTIONS ═══')

    expect(drawerEndIdx).toBeGreaterThan(0)
    expect(dayunIdx).toBeGreaterThan(drawerEndIdx)
    expect(keyPredictionsIdx).toBeGreaterThan(dayunIdx)

    // Redundant dot strip "流年一覽" is superseded by the interactive 10-year annual fortune grids
    expect(baziContent).not.toContain('流年一覽')
    expect(ziweiContent).not.toContain('流年一覽')
  })

  it('renders the redesigned Generate button with trailing credit cost badge in both BaziResultV2 and ZiweiResultV2', () => {
    const baziContent = fs.readFileSync(baziV2Path, 'utf-8')
    const ziweiContent = fs.readFileSync(ziweiV2Path, 'utf-8')

    expect(baziContent).toContain("T(lang, '免費 · 0點', 'Free · 0 pt')")
    expect(baziContent).toContain('T(lang, `✧ ${unlockCost}點機緣`, `✧ ${unlockCost} pt`)')
    expect(ziweiContent).toContain("T(lang, '免費 · 0點', 'Free · 0 pt')")
    expect(ziweiContent).toContain('T(lang, `✧ ${unlockCost}點機緣`, `✧ ${unlockCost} pt`)')
    expect(baziContent).toContain('hover:text-gold border border-gold/20 hover:border-gold/40 flex-shrink-0 whitespace-nowrap transition-colors cursor-pointer')
    expect(ziweiContent).toContain('hover:text-gold border border-gold/20 hover:border-gold/40 flex-shrink-0 whitespace-nowrap transition-colors cursor-pointer')
    expect(baziContent).not.toContain('欲深入解析該流年歲運引動、吉凶轉折與月令應期？')
    expect(baziContent).not.toContain('玄機深度精批：本步大運十年逐年詳批')
    expect(ziweiContent).not.toContain('玄機深度精批：本大限十年流年逐年詳批')
  })

  it('deduplicates Decade-level vs 10-Year vs Single-Year actions in both BaziResultV2 and ZiweiResultV2', () => {
    const baziContent = fs.readFileSync(baziV2Path, 'utf-8')
    const ziweiContent = fs.readFileSync(ziweiV2Path, 'utf-8')

    // 1. No duplicate "生成本十年流年精批" footer inside the expanded single-year fallback card
    expect(baziContent).not.toContain('生成本十年流年精批')
    expect(ziweiContent).not.toContain('生成本十年流年精批')
    expect(baziContent).not.toContain('點擊按鈕推演此十年完整的流年詳批')
    expect(ziweiContent).not.toContain('點擊按鈕推演此十年完整的流年詳批')
    expect(baziContent).not.toContain('向玄機大師追問【')

    // 2. Single 10-year generation action placed on the 10-Year Subheader Bar directly above the 10-year grid
    expect(baziContent).toContain("T(lang, '本大運十年流年（點選年份查看）', '10-Year Annual Fortunes (Click year to inspect)')")
    expect(ziweiContent).toContain("T(lang, '本大限十年流年（點選年份查看）', '10-Year Annual Fortunes (Click year to inspect)')")

    // 3. Clear scope distinction for Master inquiries: Decade level ("追問此大運" / "追問此大限") vs Single-year header button ("追問 XXXX 流年")
    expect(baziContent).toContain("T(lang, '追問此大運', 'Ask Master')")
    expect(ziweiContent).toContain("T(lang, '追問此大限', 'Ask Master')")
    expect(baziContent).toContain('T(lang, `追問 ${ln.year} 流年`, `Ask ${ln.year}`)')
    expect(ziweiContent).toContain('T(lang, `追問 ${displayYear} 流年`, `Ask ${displayYear}`)')

    // 4. Removes redundant "前3步免費 · 第4步起依大運階梯以機緣解鎖" text and uses UnlockSealIcon instead of plain "開" text
    expect(baziContent).not.toContain('依大運階梯以機緣解鎖')
    expect(ziweiContent).not.toContain('依大限階梯以機緣解鎖')
    expect(baziContent).toContain('<UnlockSealIcon size={11} color="#d4a853" />')
    expect(ziweiContent).toContain('<UnlockSealIcon size={11} color="#d4a853" />')
    expect(baziContent).not.toContain('<span className="text-[8px] text-gold">開</span>')
    expect(ziweiContent).not.toContain('<span className="text-[8px] text-gold">開</span>')
  })
})
