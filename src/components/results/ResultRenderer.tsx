'use client'

import ReadingResult from '@/components/ReadingResult'
import BaziResult from './BaziResult'
import IChingResult from './IChingResult'
import ZiweiResult from './ZiweiResult'
import QimenResult from './QimenResult'
import FengshuiResult from './FengshuiResult'
import OtherResult from './OtherResult'
import LiuYaoResult from './LiuYaoResult'
import ResultErrorBoundary from '@/components/ResultErrorBoundary'
import type { ChatMsg } from '@/types/divination'

export default function ResultRenderer({ result, type, isShared, readingId, chatMessages }: {
  result: string; type: string; isShared?: boolean; readingId?: string | null; chatMessages?: ChatMsg[]
}) {
  let parsed: Record<string, unknown>
  try {
    const raw = result.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(raw)
  } catch {
    return <ReadingResult content={result} />
  }

  // Handle paipanOnly results — adapt calculator output to display format
  if (parsed.paipanOnly) {
    const pType = (parsed.type as string) || type
    const renderPaipan = () => {
      if (pType === 'bazi' && parsed.bazi) {
        const b = parsed.bazi as Record<string, unknown>
        const adapted = {
          pillars: b.fourPillars || { year: b.yearPillar, month: b.monthPillar, day: b.dayPillar, hour: b.hourPillar },
          dayMaster: b.dayMaster,
          fiveElements: b.fiveElements,
          strength: b.strength,
          strengthLabel: b.strengthLabel,
          luckyElements: b.luckyElements,
          avoidElements: b.avoidElements,
          trueSolarTime: b.trueSolarTime,
          daYun: b.daYun,
          xiaoYun: b.xiaoYun,
          qiYun: b.qiYun,
          sections: { overview: '（只排盤模式，無AI解盤）', career: '', marriage: '', wealth: '', health: '', periods: '' },
          paipanOnly: true,
        }
        return <BaziResult data={adapted} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      }
      if (pType === 'ziwei' && parsed.ziwei) {
        const z = parsed.ziwei as Record<string, unknown>
        const adapted = {
          ziweiChart: z,
          palaces: (z as Record<string, unknown>).palaces || {},
          sections: { overview: '（只排盤模式，無AI解盤）', career: '', marriage: '', wealth: '' },
          paipanOnly: true,
        }
        return <ZiweiResult data={adapted} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      }
      if (pType === 'qimen' && (parsed.qimenChart || parsed.qimen)) {
        const qData = (parsed.qimenChart || parsed.qimen) as Record<string, unknown>
        return <QimenResult data={{ qimenChart: qData, paipanOnly: true, sections: { situation: '（只排盤模式，無AI解盤）' } }} />
      }
      if (pType === 'meihua' && parsed.meihua) {
        const meihuaData = parsed.meihua as Record<string, unknown>
        const adapted = {
          meihuaChart: meihuaData,
          subType: 'meihua',
          paipanOnly: true,
          sections: { situation: '（只排盤模式，無AI解盤）' },
        }
        return <OtherResult data={adapted} />
      }
      // Fallback: show raw JSON
      return <ReadingResult content={JSON.stringify(parsed, null, 2)} />
    }
    return (
      <ResultErrorBoundary context={`paipan|type=${pType}|readingId=${readingId || 'none'}`}>
        {renderPaipan()}
      </ResultErrorBoundary>
    )
  }

  const renderResult = () => {
    switch (type) {
      case 'bazi': return <BaziResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      case 'iching': return <IChingResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      case 'liuyao': return <LiuYaoResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      case 'ziwei': return <ZiweiResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      case 'qimen': return <QimenResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      case 'fengshui': return <FengshuiResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
      case 'meihua': return <OtherResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} readingType="meihua" chatMessages={chatMessages} />
      default: return <OtherResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} readingType={type} chatMessages={chatMessages} />
    }
  }

  return (
    <ResultErrorBoundary context={`ResultRenderer|type=${type}|readingId=${readingId || 'none'}`}>
      {renderResult()}
    </ResultErrorBoundary>
  )
}
