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

interface CityPreset {
  name_zh: string
  name_en: string
  lat: number
  lon: number
}

const POPULAR_CITIES: CityPreset[] = [
  // 直辖市
  { name_zh: '北京', name_en: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { name_zh: '上海', name_en: 'Shanghai', lat: 31.2304, lon: 121.4737 },
  { name_zh: '天津', name_en: 'Tianjin', lat: 39.3434, lon: 117.3616 },
  { name_zh: '重庆', name_en: 'Chongqing', lat: 29.5630, lon: 106.5516 },
  // 省会 & 主要城市
  { name_zh: '广州', name_en: 'Guangzhou', lat: 23.1291, lon: 113.2644 },
  { name_zh: '深圳', name_en: 'Shenzhen', lat: 22.5431, lon: 114.0579 },
  { name_zh: '成都', name_en: 'Chengdu', lat: 30.5728, lon: 104.0668 },
  { name_zh: '杭州', name_en: 'Hangzhou', lat: 30.2741, lon: 120.1551 },
  { name_zh: '武汉', name_en: 'Wuhan', lat: 30.5928, lon: 114.3055 },
  { name_zh: '南京', name_en: 'Nanjing', lat: 32.0603, lon: 118.7969 },
  { name_zh: '西安', name_en: 'Xi\'an', lat: 34.3416, lon: 108.9398 },
  { name_zh: '长沙', name_en: 'Changsha', lat: 28.2282, lon: 112.9388 },
  { name_zh: '郑州', name_en: 'Zhengzhou', lat: 34.7466, lon: 113.6253 },
  { name_zh: '苏州', name_en: 'Suzhou', lat: 31.2990, lon: 120.5853 },
  { name_zh: '济南', name_en: 'Jinan', lat: 36.6512, lon: 116.9972 },
  { name_zh: '青岛', name_en: 'Qingdao', lat: 36.0671, lon: 120.3826 },
  { name_zh: '沈阳', name_en: 'Shenyang', lat: 41.8057, lon: 123.4315 },
  { name_zh: '大连', name_en: 'Dalian', lat: 38.9140, lon: 121.6147 },
  { name_zh: '哈尔滨', name_en: 'Harbin', lat: 45.8038, lon: 126.5350 },
  { name_zh: '长春', name_en: 'Changchun', lat: 43.8171, lon: 125.3235 },
  { name_zh: '合肥', name_en: 'Hefei', lat: 31.8206, lon: 117.2272 },
  { name_zh: '福州', name_en: 'Fuzhou', lat: 26.0745, lon: 119.2965 },
  { name_zh: '厦门', name_en: 'Xiamen', lat: 24.4798, lon: 118.0894 },
  { name_zh: '南昌', name_en: 'Nanchang', lat: 28.6820, lon: 115.8579 },
  { name_zh: '昆明', name_en: 'Kunming', lat: 25.0389, lon: 102.7183 },
  { name_zh: '贵阳', name_en: 'Guiyang', lat: 26.6470, lon: 106.6302 },
  { name_zh: '南宁', name_en: 'Nanning', lat: 22.8170, lon: 108.3665 },
  { name_zh: '太原', name_en: 'Taiyuan', lat: 37.8706, lon: 112.5489 },
  { name_zh: '石家庄', name_en: 'Shijiazhuang', lat: 38.0428, lon: 114.5149 },
  { name_zh: '呼和浩特', name_en: 'Hohhot', lat: 40.8424, lon: 111.7490 },
  { name_zh: '乌鲁木齐', name_en: 'Urumqi', lat: 43.8256, lon: 87.6168 },
  { name_zh: '兰州', name_en: 'Lanzhou', lat: 36.0611, lon: 103.8343 },
  { name_zh: '银川', name_en: 'Yinchuan', lat: 38.4872, lon: 106.2309 },
  { name_zh: '西宁', name_en: 'Xining', lat: 36.6171, lon: 101.7782 },
  { name_zh: '拉萨', name_en: 'Lhasa', lat: 29.6500, lon: 91.1000 },
  { name_zh: '海口', name_en: 'Haikou', lat: 20.0174, lon: 110.3492 },
  // 台湾 & 港澳
  { name_zh: '台北', name_en: 'Taipei', lat: 25.0330, lon: 121.5654 },
  { name_zh: '高雄', name_en: 'Kaohsiung', lat: 22.6273, lon: 120.3014 },
  { name_zh: '香港', name_en: 'Hong Kong', lat: 22.3193, lon: 114.1694 },
  { name_zh: '澳门', name_en: 'Macau', lat: 22.1987, lon: 113.5439 },
  // 海外热门
  { name_zh: '东京', name_en: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name_zh: '首尔', name_en: 'Seoul', lat: 37.5665, lon: 126.9780 },
  { name_zh: '新加坡', name_en: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name_zh: '吉隆坡', name_en: 'Kuala Lumpur', lat: 3.1390, lon: 101.6869 },
  { name_zh: '纽约', name_en: 'New York', lat: 40.7128, lon: -74.0060 },
  { name_zh: '洛杉矶', name_en: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name_zh: '旧金山', name_en: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name_zh: '多伦多', name_en: 'Toronto', lat: 43.6532, lon: -79.3832 },
  { name_zh: '温哥华', name_en: 'Vancouver', lat: 49.2827, lon: -123.1207 },
  { name_zh: '伦敦', name_en: 'London', lat: 51.5074, lon: -0.1278 },
  { name_zh: '悉尼', name_en: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name_zh: '墨尔本', name_en: 'Melbourne', lat: -37.8136, lon: 144.9631 },
]

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
