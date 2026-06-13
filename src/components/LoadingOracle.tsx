'use client'

import MysticalLoader from './MysticalLoader'
import { useLang } from './LanguageContext'

interface LoadingOracleProps {
  divinationType?: string
  startTime?: number
  /** Forwarded to MysticalLoader — shows a cancel affordance after 5 min. */
  onCancel?: () => void
}

export default function LoadingOracle({ divinationType, startTime, onCancel }: LoadingOracleProps) {
  const { lang } = useLang()
  return <MysticalLoader lang={lang} variant="divination" divinationType={divinationType} startTime={startTime} onCancel={onCancel} />
}
