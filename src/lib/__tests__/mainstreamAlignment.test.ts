/**
 * Value-level tests for the mainstream-default 神煞/格局 alignment
 * (owner decision 2026-06-12 — spec: docs/deferred-evaluation-tasks.md Task A).
 * These pin the corrected table values so they can't silently drift back.
 */
import { describe, it, expect } from 'vitest'
import { SAN_QI_TOMB_PALACE, LIU_YI_TOMB_PALACE } from '../qimenCalculator'
import { detectPatterns } from '../ziweiPatterns'
import type { ZiweiChart, ZiweiPalace } from '../ziweiCalculator'

// ─── Qimen 入墓 tables: 阴阳长生十二宫 scheme ────────────────────────────
describe('qimen tomb palaces (阴阳长生 scheme)', () => {
  it('三奇: 乙墓戌→乾6, 丙墓戌→乾6, 丁墓丑→艮8', () => {
    expect(SAN_QI_TOMB_PALACE).toEqual({ '乙': 6, '丙': 6, '丁': 8 })
  })
  it('六仪: 戊→乾6, 己→艮8, 庚→艮8, 辛→巽4, 壬→巽4, 癸→坤2', () => {
    expect(LIU_YI_TOMB_PALACE).toEqual({ '戊': 6, '己': 8, '庚': 8, '辛': 4, '壬': 4, '癸': 2 })
  })
})

// ─── Ziwei 格局: classical definitions ───────────────────────────────────
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** Minimal synthetic chart: 12 empty palaces + the stars/soul placement given. */
function makeChart(opts: { soulBranch: string; sunBranch: string; moonBranch: string }): ZiweiChart {
  const palaces = BRANCHES.map((branch, i) => ({
    name: `宫${i}`,
    earthlyBranch: branch,
    majorStars: [
      ...(branch === opts.sunBranch ? [{ name: '太阳', brightness: '旺', mutagen: '' }] : []),
      ...(branch === opts.moonBranch ? [{ name: '太阴', brightness: '旺', mutagen: '' }] : []),
    ],
    minorStars: [],
    adjectiveStars: [],
  })) as unknown as ZiweiPalace[]
  return {
    palaces,
    earthlyBranchOfSoulPalace: opts.soulBranch,
  } as unknown as ZiweiChart
}

describe('ziwei 明珠出海 (命未 + 日卯 + 月亥)', () => {
  it('fires on the classical configuration', () => {
    const found = detectPatterns(makeChart({ soulBranch: '未', sunBranch: '卯', moonBranch: '亥' }))
    expect(found.map(p => p.name)).toContain('明珠出海')
  })
  it('does NOT fire on the old (wrong) 太阳辰/太阴戌 configuration', () => {
    const found = detectPatterns(makeChart({ soulBranch: '子', sunBranch: '辰', moonBranch: '戌' }))
    expect(found.map(p => p.name)).not.toContain('明珠出海')
  })
  it('requires the 命宫 to be 未 — same sun/moon elsewhere does not fire', () => {
    const found = detectPatterns(makeChart({ soulBranch: '子', sunBranch: '卯', moonBranch: '亥' }))
    expect(found.map(p => p.name)).not.toContain('明珠出海')
  })
})

describe('ziwei 日月并明 (命丑 + 日巳 + 月酉)', () => {
  it('fires on the classical configuration', () => {
    const found = detectPatterns(makeChart({ soulBranch: '丑', sunBranch: '巳', moonBranch: '酉' }))
    expect(found.map(p => p.name)).toContain('日月并明')
  })
  it('does NOT fire on bright-but-unrelated placements (old behavior)', () => {
    const found = detectPatterns(makeChart({ soulBranch: '子', sunBranch: '午', moonBranch: '戌' }))
    expect(found.map(p => p.name)).not.toContain('日月并明')
  })
})
