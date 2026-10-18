import { describe, it, expect } from 'vitest'
import {
  PAIPAN_EXPLANATION,
  EARLY_LATE_ZI_EXPLANATION,
  LIUYAO_CAST_PRINCIPLE,
  FENGSHUI_DEMO_EXAMPLE,
} from '../guidanceConfig'

describe('Divination Form Guidance & Terminology Standards', () => {
  it('clarifies paipanOnly with unambiguous English and Chinese terminology without jargon', () => {
    // Replaces jargon "Paipan only" that previously confused western users
    expect(PAIPAN_EXPLANATION.buttonLabel.en).not.toBe('Paipan only')
    expect(PAIPAN_EXPLANATION.buttonLabel.en).toContain('No interpretation')
    expect(PAIPAN_EXPLANATION.buttonLabel.zh).toContain('不含解盤')

    expect(PAIPAN_EXPLANATION.tooltip.zh).toContain('不進行深度解盤')
    expect(PAIPAN_EXPLANATION.tooltip.en).toContain('skipping the in-depth reading report')
  })

  it('provides precise cultural and astrological explanation for early/late Zi hour', () => {
    expect(EARLY_LATE_ZI_EXPLANATION.tooltip.zh).toContain('23:00-01:00')
    expect(EARLY_LATE_ZI_EXPLANATION.tooltip.zh).toContain('日柱')
    expect(EARLY_LATE_ZI_EXPLANATION.tooltip.en).toContain('day pillar')
  })

  it('provides the synchronicity principle for Liu Yao coin casting', () => {
    expect(LIUYAO_CAST_PRINCIPLE.content.zh).toContain('三枚銅錢連擲六次')
    expect(LIUYAO_CAST_PRINCIPLE.content.zh).toContain('天地人三才')
    expect(LIUYAO_CAST_PRINCIPLE.content.en).toContain('Heaven, Earth, and Humanity')
  })

  it('provides rich demonstrative occupant and house orientation examples for Feng Shui', () => {
    expect(FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.zh).toContain('居住者性別')
    expect(FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.zh).toContain('大門朝向')
    expect(FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.zh).toContain('客廳')
    expect(FENGSHUI_DEMO_EXAMPLE.exampleOwnerInfo.en).toContain('Occupant')
  })
})
