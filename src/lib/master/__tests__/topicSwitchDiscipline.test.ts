import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { masterToolRegistry } from '../tools'

describe('Master Topic Switching & 一事一占 (One Matter, One Divination) Discipline', () => {
  it('master.md defines clear rules prohibiting cross-topic hexagram reuse for event divinations', () => {
    const masterMdPath = path.resolve(__dirname, '../../../../divination-refs/master.md')
    const content = fs.readFileSync(masterMdPath, 'utf-8')

    // Section exists
    expect(content).toContain('話題切換與「一事一占」原則')

    // Lifelong vs Event distinction
    expect(content).toContain('命盤類 (BaZi / ZiWei)')
    expect(content).toContain('事件類 (LiuYao / MeiHua / IChing / QiMen / FengShui)')

    // Prohibits cross-topic reuse
    expect(content).toContain('嚴禁跨話題套卦')
    expect(content).toContain('不可移花接木套用舊卦')

    // Proactive redirect instruction
    expect(content).toContain('prefill_divination_form')
  })

  it('templates.md defines Template F for new event inquiry and topic shift', () => {
    const templatesPath = path.resolve(__dirname, '../../../../divination-refs/master-appendices/templates.md')
    const content = fs.readFileSync(templatesPath, 'utf-8')

    expect(content).toContain('Template F')
    expect(content).toContain('一事一占')
    expect(content).toContain('prefill_divination_form')
  })

  it('route.ts injects question and event discipline when viewing reading is an event divination', () => {
    const routePath = path.resolve(__dirname, '../../../app/api/master/route.ts')
    const content = fs.readFileSync(routePath, 'utf-8')

    expect(content).toContain('isEventDivination')
    expect(content).toContain('EVENT DIVINATION DISCIPLINE')
    expect(content).toContain('viewing.question')
    expect(content).toContain('prefill_divination_form')
  })

  it('get_reading tool contract returns question from the database', () => {
    const getReading = masterToolRegistry.get('get_reading')
    expect(getReading).toBeDefined()
    expect(getReading?.description).toContain('一事一占')
    expect(getReading?.description).toContain('question')
  })
})
