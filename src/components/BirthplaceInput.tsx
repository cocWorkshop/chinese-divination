'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLang } from './LanguageContext'
import { POPULAR_CITIES, type CityPreset } from '@/lib/cities'

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
  const [presetResults, setPresetResults] = useState<CityPreset[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [isSouthern, setIsSouthern] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter preset cities by query
  const filterPresets = useCallback((query: string): CityPreset[] => {
    if (query.length < 1) return []
    const q = query.toLowerCase()
    return POPULAR_CITIES.filter(c =>
      c.name_zh.includes(query) || c.name_en.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [])

  const search = useCallback(async (query: string) => {
    if (query.length < 2) { setResults([]); setPresetResults([]); setSearchError(false); return }

    // Always show matching presets immediately
    const presets = filterPresets(query)
    setPresetResults(presets)

    // Abort previous request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setSearchError(false)

    try {
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=${lang === 'en' ? 'en' : 'zh'}`,
        { headers: { 'User-Agent': 'XuanjiDivination/1.0' }, signal: controller.signal }
      )
      clearTimeout(timeoutId)
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setShowDropdown(data.length > 0 || presets.length > 0)
      setSearchError(false)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setSearchError(true)
        setResults([])
      }
      // Still show presets even when API fails
      setShowDropdown(presets.length > 0)
    } finally {
      setIsLoading(false)
    }
  }, [lang, filterPresets])

  const handleInput = (val: string) => {
    onChange(val)
    // Show presets immediately while typing
    const presets = filterPresets(val)
    setPresetResults(presets)
    if (presets.length > 0) setShowDropdown(true)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (displayName: string, lat: number, lon: number) => {
    onChange(displayName)
    setShowDropdown(false)
    onLatLngChange?.(lat, lon)
    const south = lat < 0
    setIsSouthern(south)
    onSouthernHemisphere?.(south)
  }

  const handleSelectNominatim = (item: NominatimResult) => {
    handleSelect(item.display_name, parseFloat(item.lat), parseFloat(item.lon))
  }

  const handleSelectPreset = (city: CityPreset) => {
    const displayName = lang === 'en' ? city.name_en : city.name_zh
    handleSelect(displayName, city.lat, city.lon)
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

  const hasResults = presetResults.length > 0 || results.length > 0

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => {
            if (hasResults) setShowDropdown(true)
            // Show all presets when focused with empty input
            if (!value) {
              setPresetResults(POPULAR_CITIES.slice(0, 8))
              setShowDropdown(true)
            }
          }}
          className={className || "w-full px-4 py-3 bg-navy-800 dark:bg-navy-800 light:bg-white border border-gold/20 dark:border-gold/20 light:border-[#e8dcc8] rounded-lg text-white dark:text-white light:text-[#2d1f0e] focus:outline-none focus:border-gold/60 transition-colors"}
          placeholder={placeholder || T(lang, '輸入城市名稱搜尋...', 'Search city name...')}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error message */}
      {searchError && (
        <p className="mt-1 text-amber-400 dark:text-amber-400 light:text-amber-600 text-xs flex items-center gap-1">
          <span>⚠️</span>
          {T(lang, '在線搜尋失敗，請從常用城市中選擇或重試', 'Online search failed, please select from popular cities or retry')}
        </p>
      )}

      {/* Dropdown */}
      {showDropdown && (presetResults.length > 0 || results.length > 0) && (
        <ul className="absolute z-50 w-full mt-1 bg-navy-800 dark:bg-navy-800 light:bg-white border border-gold/20 dark:border-gold/20 light:border-[#e8dcc8] rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {/* Preset cities */}
          {presetResults.length > 0 && (
            <>
              <li className="px-4 py-1.5 text-xs text-white/40 dark:text-white/40 light:text-[#8b7355] bg-navy-900/50 dark:bg-navy-900/50 light:bg-[#f9f5ec] sticky top-0">
                {T(lang, '常用城市', 'Popular Cities')}
              </li>
              {presetResults.map(c => (
                <li
                  key={`preset-${c.name_en}`}
                  onClick={() => handleSelectPreset(c)}
                  className="px-4 py-2.5 cursor-pointer text-sm text-white/80 dark:text-white/80 light:text-[#2d1f0e] hover:bg-gold/10 dark:hover:bg-gold/10 light:hover:bg-[#f5f0e0] transition-colors border-b border-white/5 dark:border-white/5 light:border-[#e8dcc8]/50 last:border-0"
                >
                  {lang === 'en' ? c.name_en : `${c.name_zh} (${c.name_en})`}
                </li>
              ))}
            </>
          )}
          {/* Nominatim results */}
          {results.length > 0 && (
            <>
              <li className="px-4 py-1.5 text-xs text-white/40 dark:text-white/40 light:text-[#8b7355] bg-navy-900/50 dark:bg-navy-900/50 light:bg-[#f9f5ec] sticky top-0">
                {T(lang, '搜尋結果', 'Search Results')}
              </li>
              {results.map(r => (
                <li
                  key={r.place_id}
                  onClick={() => handleSelectNominatim(r)}
                  className="px-4 py-2.5 cursor-pointer text-sm text-white/80 dark:text-white/80 light:text-[#2d1f0e] hover:bg-gold/10 dark:hover:bg-gold/10 light:hover:bg-[#f5f0e0] transition-colors border-b border-white/5 dark:border-white/5 light:border-[#e8dcc8]/50 last:border-0"
                >
                  {r.display_name}
                </li>
              ))}
            </>
          )}
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
