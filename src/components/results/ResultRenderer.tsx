'use client'

import dynamic from 'next/dynamic'
import ReadingResult from '@/components/ReadingResult'
import ResultErrorBoundary from '@/components/ResultErrorBoundary'
import ChartSkeleton from '@/components/reading/ChartSkeleton'
import type { ChatMsg } from '@/types/divination'

const BaziResult = dynamic(() => import('./BaziResult'), { loading: () => <ChartSkeleton type="bazi" /> })
const BaziResultV2 = dynamic(() => import('./BaziResultV2'), { loading: () => <ChartSkeleton type="bazi" /> })
const ZiweiResultV2 = dynamic(() => import('./ZiweiResultV2'), { loading: () => <ChartSkeleton type="ziwei" /> })
const ZiweiResult = dynamic(() => import('./ZiweiResult'), { loading: () => <ChartSkeleton type="ziwei" /> })
const IChingResult = dynamic(() => import('./IChingResult'), { loading: () => <ChartSkeleton type="iching" /> })
const QimenResult = dynamic(() => import('./QimenResult'), { loading: () => <ChartSkeleton type="qimen" /> })
const FengshuiResult = dynamic(() => import('./FengshuiResult'), { loading: () => <ChartSkeleton type="fengshui" /> })
const LiuYaoResult = dynamic(() => import('./LiuYaoResult'), { loading: () => <ChartSkeleton type="liuyao" /> })
const OtherResult = dynamic(() => import('./OtherResult'), { loading: () => <ChartSkeleton type="other" /> })

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
