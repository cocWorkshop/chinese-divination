'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLang } from './LanguageContext'

const T = (lang: string, zhTW: string, en: string) =>
  lang === 'en' ? en : zhTW

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface BirthplaceInputProps {
  value: string
  onChange: (value: string) => void
  onLatLngChange?: (lat: number | null, lng: number | null) => void
  className?: string
  placeholder?: string
  onSouthernHemisphere?: (isSouth: boolean) => void
}

export default function BirthplaceInput({ value, onChange, onLatLngChange, className, placeholder, onSouthernHemisphere }: BirthplaceInputProps) {
  const { lang } = useLang()
  const [results, setResults] = useState<NominatimResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSouthern, setIsSouthern] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (query: string) => {
    if (query.length < 2) { setResults([]); return }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=zh`,
        { headers: { 'User-Agent': 'XuanjiDivination/1.0' } }
      )
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setShowDropdown(data.length > 0)
    } catch {
      setResults([])
    }
  }, [])

  const handleInput = (val: string) => {
    onChange(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (item: NominatimResult) => {
    onChange(item.display_name)
    setShowDropdown(false)
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    onLatLngChange?.(lat, lng)
    const south = lat < 0
    setIsSouthern(south)
    onSouthernHemisphere?.(south)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        className={className || "w-full px-4 py-3 bg-navy-800 dark:bg-navy-800 light:bg-white border border-gold/20 dark:border-gold/20 light:border-[#e8dcc8] rounded-lg text-white dark:text-white light:text-[#2d1f0e] focus:outline-none focus:border-gold/60 transition-colors"}
        placeholder={placeholder || T(lang, '輸入城市名稱搜尋...', 'Search city name...')}
      />
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-navy-800 dark:bg-navy-800 light:bg-white border border-gold/20 dark:border-gold/20 light:border-[#e8dcc8] rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {results.map(r => (
            <li
              key={r.place_id}
              onClick={() => handleSelect(r)}
              className="px-4 py-2.5 cursor-pointer text-sm text-white/80 dark:text-white/80 light:text-[#2d1f0e] hover:bg-gold/10 dark:hover:bg-gold/10 light:hover:bg-[#f5f0e0] transition-colors border-b border-white/5 dark:border-white/5 light:border-[#e8dcc8]/50 last:border-0"
            >
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
      {isSouthern && (
        <p className="mt-1.5 text-amber-400 dark:text-amber-400 light:text-amber-600 text-xs flex items-center gap-1">
          <span>⚠️</span>
          {T(lang, '暫不支持南半球出生地的八字排盤', 'Southern hemisphere birth charts are not yet supported')}
        </p>
      )}
    </div>
  )
}
