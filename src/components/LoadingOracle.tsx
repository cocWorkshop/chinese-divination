'use client'

import MysticalLoader from './MysticalLoader'
import { useLang } from './LanguageContext'

interface LoadingOracleProps {
  divinationType?: string
}

export default function LoadingOracle({ divinationType }: LoadingOracleProps) {
  const { lang } = useLang()
  return <MysticalLoader lang={lang} variant="divination" divinationType={divinationType} />
}
