import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { typeMap, getPosterConfig } from '../fatePosterConfig'
import { POSTER_RATIOS, extractCleanReadingExcerpt } from '@/lib/share/socialShare'

describe('FatePosterModal configuration, clean excerpt extraction, and collapsible section placement', () => {
  it('maps all primary systems to classical 8-character mottos', () => {
    expect(typeMap.bazi.motto).toBe('逢凶化吉 · 貴人照臨')
    expect(typeMap.ziwei.motto).toBe('洞見星機 · 趨吉避凶')
    expect(typeMap.liuyao.motto).toBe('動靜相生 · 先機在握')
    expect(typeMap.meihua.motto).toBe('萬物皆數 · 體用相合')
    expect(typeMap.qimen.motto).toBe('急則從神 · 緩則從門')
    expect(typeMap.fengshui.motto).toBe('藏風聚氣 · 宅運亨通')
    expect(typeMap.iching.motto).toBe('自強不息 · 順天應人')
  })

  it('provides dignified fallback for custom or new systems', () => {
    const fallback = getPosterConfig('custom_divination')
    expect(fallback.motto).toBe('天道酬勤 · 順應時機')
    expect(fallback.zh).toBe('東方命理')
    expect(fallback.en).toBe('Chinese Divination')
  })

  it('integrates 3:4 and 9:16 aspect ratios for cross-platform posting', () => {
    expect(POSTER_RATIOS['3:4'].width).toBe(1080)
    expect(POSTER_RATIOS['3:4'].height).toBe(1440)
    expect(POSTER_RATIOS['9:16'].width).toBe(1080)
    expect(POSTER_RATIOS['9:16'].height).toBe(1920)
  })

  it('extracts human-readable prose from V2 JSON reading results without leaking raw JSON syntax', () => {
    const v2Json = JSON.stringify({
      version: 2,
      pillars: { year: { stem: '己', branch: '巳' } },
      sections: {
        overview: '日主癸水生於子月，得令而旺，宜以木火疏通水氣。',
      },
      sectionSummaries: {
        overview: '癸水生子月，喜木火相生，中年後運途大展。',
      },
    })

    const excerpt = extractCleanReadingExcerpt(v2Json, 96)
    expect(excerpt).toBe('癸水生子月，喜木火相生，中年後運途大展。')
    expect(excerpt).not.toContain('version')
    expect(excerpt).not.toContain('pillars')
  })

  it('places FatePosterSection below ReadingFeedback as a collapsed SectionDrawer and removes the top header button', () => {
    const cardPath = path.resolve(__dirname, '../../ReadingResultCard.tsx')
    const posterPath = path.resolve(__dirname, '../FatePosterModal.tsx')
    const cardContent = fs.readFileSync(cardPath, 'utf-8')
    const posterContent = fs.readFileSync(posterPath, 'utf-8')

    // Top header button "命理籤卡" is removed from ReadingResultCard header
    expect(cardContent).not.toContain("T(lang, '命理籤卡', 'Fate Poster')")

    // Placed after ReadingFeedback and collapsed by default
    const feedbackIdx = cardContent.indexOf('<ReadingFeedback')
    const posterIdx = cardContent.indexOf('<FatePosterSection')
    expect(feedbackIdx).toBeGreaterThan(0)
    expect(posterIdx).toBeGreaterThan(feedbackIdx)
    expect(cardContent).toContain('defaultOpen={false}')
    expect(posterContent).toContain('<SectionDrawer')
  })
})
