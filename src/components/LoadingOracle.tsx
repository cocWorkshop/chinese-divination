'use client'

import MysticalLoader from './MysticalLoader'
import { useLang } from './LanguageContext'

export default function LoadingOracle() {
  const { lang } = useLang()
  return <MysticalLoader lang={lang} variant="divination" />
}
