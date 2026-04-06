'use client'

import ReadingResult from '@/components/ReadingResult'
import BaziResult from './BaziResult'
import BaziResultV2 from './BaziResultV2'
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

  // Determine effective type (paipanOnly results may carry their own type)
  const effectiveType = (parsed.paipanOnly ? (parsed.type as string) : null) || type

  const props = { data: parsed, isShared, rawResult: result, readingId, chatMessages }

  const renderResult = () => {
    switch (effectiveType) {
      case 'bazi': return parsed.version === 2 ? <BaziResultV2 {...props} /> : <BaziResult {...props} />
      case 'iching': return <IChingResult {...props} />
      case 'liuyao': return <LiuYaoResult {...props} />
      case 'ziwei': return <ZiweiResult {...props} />
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
