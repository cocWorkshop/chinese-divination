'use client'

import ReadingResult from '@/components/ReadingResult'
import BaziResult from './BaziResult'
import BaziResultV2 from './BaziResultV2'
import ZiweiResultV2 from './ZiweiResultV2'
import IChingResult from './IChingResult'
import ZiweiResult from './ZiweiResult'
import QimenResult from './QimenResult'
import FengshuiResult from './FengshuiResult'
import OtherResult from './OtherResult'
import LiuYaoResult from './LiuYaoResult'
import ResultErrorBoundary from '@/components/ResultErrorBoundary'
import type { ChatMsg } from '@/types/divination'

export default function ResultRenderer({ result, type, isShared, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }: {
  result: string; type: string; isShared?: boolean; readingId?: string | null; chatMessages?: ChatMsg[]
  subjectName?: string | null
  birthInfo?: {
    birthDate?: string
    birthTime?: string
    gender?: string
    calendarType?: string
    birthPlace?: string
    exactTime?: string
  } | null
  createdAt?: string
  /**
   * True while a partial-result SSE stream is still arriving. Renderers
   * use this to show typing-dot placeholders for sections that haven't
   * been filled yet, and (for bazi/ziwei) we force the V2 layout because
   * mid-stream the `version` flag may not have arrived yet.
   */
  streaming?: boolean
}) {
  let parsed: Record<string, unknown>
  try {
    const raw = result.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(raw)
  } catch {
    return <ReadingResult content={result} />
  }

  // Determine effective type (paipanOnly results may carry their own type)
  const effectiveType = (parsed.paipanOnly ? (parsed.type as string) : null) || type

  const props = { data: parsed, isShared, rawResult: result, readingId, chatMessages, subjectName, birthInfo, createdAt, streaming }

  // While streaming, force V2 for bazi/ziwei — the streaming pipeline only
  // produces V2 outputs, but the `version` marker may not have arrived in
  // the partial yet. Without this guard, the first few seconds of the
  // stream would render through the V1 component, then snap to V2 once the
  // version field landed (jarring transition).
  const isV2 = streaming ? true : parsed.version === 2

  const renderResult = () => {
    switch (effectiveType) {
      case 'bazi': return isV2 ? <BaziResultV2 {...props} /> : <BaziResult {...props} />
      case 'iching': return <IChingResult {...props} />
      case 'liuyao': return <LiuYaoResult {...props} />
      case 'ziwei': return isV2 ? <ZiweiResultV2 {...props} /> : <ZiweiResult {...props} />
      case 'qimen': return <QimenResult {...props} />
      case 'fengshui': return <FengshuiResult {...props} />
      case 'meihua': return <OtherResult {...props} readingType="meihua" />
      default: return <OtherResult {...props} readingType={effectiveType} />
    }
  }

  return (
    <ResultErrorBoundary context={`ResultRenderer|type=${effectiveType}|readingId=${readingId || 'none'}`}>
      {renderResult()}
    </ResultErrorBoundary>
  )
}
