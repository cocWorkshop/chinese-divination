'use client'

import ReadingResult from '@/components/ReadingResult'
import BaziResult from './BaziResult'
import IChingResult from './IChingResult'
import ZiweiResult from './ZiweiResult'
import QimenResult from './QimenResult'
import FengshuiResult from './FengshuiResult'
import OtherResult from './OtherResult'
import LiuYaoResult from './LiuYaoResult'

interface ChatMsg { role: 'user' | 'assistant'; content: string }

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

  switch (type) {
    case 'bazi': return <BaziResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
    case 'iching': return <IChingResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
    case 'liuyao': return <LiuYaoResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
    case 'ziwei': return <ZiweiResult data={parsed} isShared={isShared} rawResult={result} readingId={readingId} chatMessages={chatMessages} />
    case 'qimen': return <QimenResult data={parsed} />
    case 'fengshui': return <FengshuiResult data={parsed} />
    default: return <OtherResult data={parsed} />
  }
}
