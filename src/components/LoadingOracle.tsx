'use client'

import MysticalLoader from './MysticalLoader'
import { useLang } from './LanguageContext'

interface LoadingOracleProps {
  divinationType?: string
  startTime?: number
}

export default function LoadingOracle({ divinationType, startTime }: LoadingOracleProps) {
  const { lang } = useLang()
  return <MysticalLoader lang={lang} variant="divination" divinationType={divinationType} startTime={startTime} />
}
