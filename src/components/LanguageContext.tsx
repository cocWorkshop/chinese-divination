'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Lang = 'zh-TW' | 'en'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh-TW',
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh-TW')

  useEffect(() => {
    const stored = localStorage.getItem('lang')
    if (stored === 'zh-TW' || stored === 'en') {
      setLangState(stored)
    } else if (stored === 'zh') {
      // Migrate from old simplified Chinese to Traditional
      setLangState('zh-TW')
      localStorage.setItem('lang', 'zh-TW')
    } else {
      // Auto-detect from browser language: zh-* → zh-TW, everything else → en
      const browserLang = navigator.language || ''
      const detected: Lang = browserLang.startsWith('zh') ? 'zh-TW' : 'en'
      setLangState(detected)
      localStorage.setItem('lang', detected)
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}

export default LanguageContext
