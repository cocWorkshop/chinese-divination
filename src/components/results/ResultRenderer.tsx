'use client'

import ReadingResult from '@/components/ReadingResult'
import BaziResult from './BaziResult'
import IChingResult from './IChingResult'
import ZiweiResult from './ZiweiResult'
import QimenResult from './QimenResult'
import FengshuiResult from './FengshuiResult'
import OtherResult from './OtherResult'

export default function ResultRenderer({ result, type, isShared }: { result: string; type: string; isShared?: boolean }) {
  let parsed: Record<string, unknown>
  try {
    const raw = result.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(raw)
  } catch {
    return <ReadingResult content={result} />
  }

  switch (type) {
    case 'bazi': return <BaziResult data={parsed} isShared={isShared} rawResult={result} />
    case 'iching': return <IChingResult data={parsed} />
    case 'ziwei': return <ZiweiResult data={parsed} isShared={isShared} rawResult={result} />
    case 'qimen': return <QimenResult data={parsed} />
    case 'fengshui': return <FengshuiResult data={parsed} />
    default: return <OtherResult data={parsed} />
  }
}
