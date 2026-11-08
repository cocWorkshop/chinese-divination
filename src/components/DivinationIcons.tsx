// Consistent divination glyphs and mystical SVG utility icons
// Styled after DivinationLayout Demo with traditional oriental sanctuary aesthetic
import React from 'react'

export interface IconProps {
  size?: number
  className?: string
  color?: string
}

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

function resolvePixelSize(size?: number, className: string = ''): number {
  if (size) return size
  const wMatch = className.match(/\bw-(\d+)\b/)
  if (wMatch) {
    return parseInt(wMatch[1], 10) * 4
  }
  const sizeMatch = className.match(/\b(?:text|w|h)-\[(\d+)px\]/)
  if (sizeMatch) {
    return parseInt(sizeMatch[1], 10)
  }
  return 24
}

interface GlyphConfig {
  glyph: string
  label: string
}

// Global glyph mapping matching DivinationLayout Demo
// Note: BaZi uses the classical '命書卷軸 / 庚帖' (📜) instead of unrelated prayer beads
const GLYPH_MAP: Record<string, GlyphConfig> = {
  bazi: { glyph: '📜', label: '八字命理' },
  liuyao: { glyph: '🪙', label: '六爻占卜' },
  iching: { glyph: '☯', label: '易經占卜' },
  ziwei: { glyph: '✨', label: '紫微斗數' },
  qimen: { glyph: '🧭', label: '奇門遁甲' },
  fengshui: { glyph: '🏔️', label: '風水佈局' },
  meihua: { glyph: '🌸', label: '梅花易數' },
  xiaoliuren: { glyph: '✋', label: '小六壬' },
  tarot: { glyph: '🃏', label: '塔羅牌陣' },
  other: { glyph: '📜', label: '典籍秘卷' },
}

export function renderDivinationGlyph(
  type: string,
  props: IconProps & { style?: React.CSSProperties }
) {
  const config = GLYPH_MAP[type] || { glyph: '📜', label: '正統術數' }
  const pixel = resolvePixelSize(props.size, props.className)
  return (
    <span
      role="img"
      aria-label={config.label}
      className={`inline-flex items-center justify-center select-none leading-none shrink-0 ${props.className || ''}`.trim()}
      style={{
        fontSize: `${pixel}px`,
        lineHeight: 1,
        verticalAlign: 'middle',
        fontFamily: EMOJI_FONT,
        ...props.style,
      }}
    >
      {config.glyph}
    </span>
  )
}

// 八字命理 — 古典命書卷軸 / 乾坤庚帖 (取代無關之念珠，正統直觀)
export function BaZiIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('bazi', props)
}

// 易經占卜 — 周易太極陰陽兩儀
export function IChingIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('iching', props)
}

// 紫微斗數 — 北極紫微星曜 / 斗數星盤
export function ZiWeiIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('ziwei', props)
}

// 奇門遁甲 — 奇門九宮羅盤
export function QiMenIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('qimen', props)
}

// 風水佈局 — 山水巒頭形勢
export function FengShuiIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('fengshui', props)
}

// 梅花易數 — 梅花綻放起卦
export function MeiHuaIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('meihua', props)
}

// 六爻神課 — 古銅錢搖卦起六爻
export function LiuYaoIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('liuyao', props)
}

// 小六壬掌訣 — 大安留連指掌
export function XiaoLiuRenIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('xiaoliuren', props)
}

// 塔羅牌陣 — 奧秘卡牌
export function TarotIcon(props: IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph('tarot', props)
}

// 东方天机仙师 / 玄真道长图腾 (彻底替换甘道夫巫师 🧙‍♂️)
export function MasterSageIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      {/* Outer halo */}
      <circle cx="12" cy="12" r="10.5" stroke={stroke} strokeWidth="0.75" strokeDasharray="1.5 1.5" opacity="0.6"/>
      {/* Daoist Topknot with hairpin */}
      <ellipse cx="12" cy="5.2" rx="2" ry="1.4" fill={stroke} opacity="0.85"/>
      <line x1="8.5" y1="5.2" x2="15.5" y2="5.2" stroke={stroke} strokeWidth="1" strokeLinecap="round"/>
      {/* Serene face contour */}
      <path d="M8.8 8.2 C8.8 6.5 15.2 6.5 15.2 8.2 C15.2 11.2 13.5 12.8 12 13 C10.5 12.8 8.8 11.2 8.8 8.2 Z" fill="none" stroke={stroke} strokeWidth="1.1"/>
      {/* Flowing Daoist Beard */}
      <path d="M10.5 12.2 C11 14 11.5 15.5 12 16.2 C12.5 15.5 13 14 13.5 12.2" stroke={stroke} strokeWidth="0.9" strokeLinecap="round"/>
      {/* Celestial robe collar */}
      <path d="M5 20 C6.5 16 9.5 14.2 12 14.5 C14.5 14.2 17.5 16 19 20" stroke={stroke} strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="12" y1="14.5" x2="12" y2="20" stroke={stroke} strokeWidth="0.9" strokeDasharray="1 1" opacity="0.7"/>
    </svg>
  )
}

// 官禄仕途 / 事业 — 印玺文昌
export function CareerIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M12 10v4" />
      <circle cx="12" cy="14" r="1" fill={stroke} />
    </svg>
  )
}

// 良缘合婚 / 婚姻 — 灵犀两仪
export function MarriageIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#e06c75'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 9v4 M10 11h4" strokeWidth="1" opacity="0.6" />
    </svg>
  )
}

// 财帛天府 / 财富 — 泉布古钱
export function WealthIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="9" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
    </svg>
  )
}

// 颐养康泰 / 健康 — 悬壶灵草
export function HealthIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#2d8a6e'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="M11 2a2 2 0 0 0-2 2v2H8a2 2 0 0 0-2 2v1h12V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2h-2z" />
      <circle cx="12" cy="15" r="6" />
      <path d="M12 12v6 M9 15h6" />
    </svg>
  )
}

// 宗族六亲 / 家族 — 华盖家堂
export function FamilyIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#a371f7'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

// 灵台性格 — 明镜心神
export function PersonalityIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#56b6c2'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v4 M12 16v4 M4 12h4 M16 12h4" strokeWidth="1" opacity="0.6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// 天机罗庚 — 关键落宫/神煞指针
export function KeyPredictionIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="12,6 15,12 12,11 9,12" fill={stroke} stroke="none" />
      <polygon points="12,18 15,12 12,13 9,12" fill="none" stroke={stroke} strokeWidth="1" />
    </svg>
  )
}

// 金石密印 / 锁定
export function LockSealIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.5" fill={stroke} />
    </svg>
  )
}

// 灵光星芒 — Sparkle / Inspiration
export function SparkleIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={stroke} stroke="none" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  )
}

// 典籍卷軸 — Scroll
export function ScrollIcon({ size = 20, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h11a2 2 0 0 0 2-2v-2" />
      <path d="M4 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4z" />
      <line x1="7" y1="9" x2="15" y2="9" />
      <line x1="7" y1="13" x2="13" y2="13" />
    </svg>
  )
}

// 日月星汉 — Sun & Moon
export function SunMoonIcon({ size = 18, isDark = true, className = '', color }: IconProps & { isDark?: boolean }) {
  const stroke = color || 'currentColor'
  if (isDark) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

// 告示金铎 — Notice / Announcement
export function NoticeIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// 警示印记 — Alert / Warning
export function AlertIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#e5c07b'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <polygon points="12 2 2 22 22 22 12 2" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="18" r="0.75" fill={stroke} />
    </svg>
  )
}

// 结缘礼鼎 / 机缘福袋 — Gift / Karma
export function GiftVesselIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

// 契合真印 — Check / Success
export function CheckSealIcon({ size = 18, className = '', color }: IconProps) {
  const stroke = color || '#2d8a6e'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// 闭合印记 — Close / Dismiss
export function CloseIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// 开辟新篇 / 加号 — Plus / New Chat
export function PlusIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// 下拉箭头 — Chevron Down
export function ChevronDownIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// 乾坤重转 — Refresh / Retry
export function RefreshIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

// 分享传道 — Share / Export
export function ShareIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

// 灵犀连结 — Link
export function LinkIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

// 誊录文卷 — Copy / Duplicate
export function CopyIcon({ size = 16, className = '', color }: IconProps) {
  const stroke = color || 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

// Dynamic divination icon renderer matching DivinationLayout Demo
export function DivinationIcon({
  type,
  size,
  className = '',
  color,
  style,
}: { type: string } & IconProps & { style?: React.CSSProperties }) {
  return renderDivinationGlyph(type, { size, className, color, style })
}
