// Consistent mystical SVG icons for all divination types
// Navy + gold theme, modern mystical style
import React from 'react'

export interface IconProps {
  size?: number
  className?: string
  color?: string
}

// 八字命理 — Four Pillars of Destiny
export function BaZiIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* Four pillars */}
      <rect x="18" y="25" width="14" height="50" rx="3" fill="none" stroke={stroke} strokeWidth="2"/>
      <rect x="36" y="25" width="14" height="50" rx="3" fill="none" stroke={stroke} strokeWidth="2"/>
      <rect x="54" y="25" width="14" height="50" rx="3" fill="none" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      <rect x="72" y="25" width="14" height="50" rx="3" fill="none" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      {/* Heavenly stems marks */}
      <line x1="22" y1="38" x2="28" y2="38" stroke={stroke} strokeWidth="2"/>
      <line x1="40" y1="35" x2="46" y2="35" stroke={stroke} strokeWidth="2"/>
      <line x1="58" y1="40" x2="64" y2="40" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      <line x1="76" y1="36" x2="82" y2="36" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      {/* Earthly branches marks */}
      <line x1="22" y1="58" x2="28" y2="58" stroke={stroke} strokeWidth="2"/>
      <line x1="22" y1="63" x2="28" y2="63" stroke={stroke} strokeWidth="2"/>
      <line x1="40" y1="58" x2="46" y2="58" stroke={stroke} strokeWidth="2"/>
      <line x1="40" y1="63" x2="46" y2="63" stroke={stroke} strokeWidth="2"/>
      <line x1="58" y1="58" x2="64" y2="58" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      <line x1="58" y1="63" x2="64" y2="63" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      <line x1="76" y1="58" x2="82" y2="58" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      <line x1="76" y1="63" x2="82" y2="63" stroke={stroke} strokeWidth="2" opacity="0.7"/>
    </svg>
  )
}

// 易經占卜 — Yin-Yang (reuse existing)
export { default as IChingIcon } from './YinYangIcon'

// 紫微斗數 — Star constellation / celestial chart
export function ZiWeiIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* Central star */}
      <polygon points="50,15 56,35 78,35 60,47 67,68 50,55 33,68 40,47 22,35 44,35" fill={stroke} opacity="0.9"/>
      {/* Orbit rings */}
      <ellipse cx="50" cy="50" rx="38" ry="38" fill="none" stroke={stroke} strokeWidth="1" opacity="0.3"/>
      <ellipse cx="50" cy="50" rx="28" ry="28" fill="none" stroke={stroke} strokeWidth="1" opacity="0.2"/>
      {/* Constellation dots */}
      <circle cx="25" cy="70" r="2.5" fill={stroke} opacity="0.6"/>
      <circle cx="75" cy="70" r="2.5" fill={stroke} opacity="0.6"/>
      <circle cx="20" cy="40" r="2" fill={stroke} opacity="0.4"/>
      <circle cx="80" cy="40" r="2" fill={stroke} opacity="0.4"/>
      <circle cx="35" cy="82" r="1.5" fill={stroke} opacity="0.3"/>
      <circle cx="65" cy="82" r="1.5" fill={stroke} opacity="0.3"/>
    </svg>
  )
}

// 奇門遁甲 — Nine-palace grid with mystical compass feel
export function QiMenIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* 3x3 Grid */}
      <rect x="20" y="20" width="60" height="60" rx="3" fill="none" stroke={stroke} strokeWidth="1.5"/>
      <line x1="40" y1="20" x2="40" y2="80" stroke={stroke} strokeWidth="1" opacity="0.6"/>
      <line x1="60" y1="20" x2="60" y2="80" stroke={stroke} strokeWidth="1" opacity="0.6"/>
      <line x1="20" y1="40" x2="80" y2="40" stroke={stroke} strokeWidth="1" opacity="0.6"/>
      <line x1="20" y1="60" x2="80" y2="60" stroke={stroke} strokeWidth="1" opacity="0.6"/>
      {/* Center door symbol */}
      <circle cx="50" cy="50" r="8" fill="none" stroke={stroke} strokeWidth="2"/>
      <circle cx="50" cy="50" r="3" fill={stroke}/>
      {/* Directional markers */}
      <polygon points="50,12 47,18 53,18" fill={stroke} opacity="0.7"/>
      <polygon points="50,88 47,82 53,82" fill={stroke} opacity="0.5"/>
      <polygon points="12,50 18,47 18,53" fill={stroke} opacity="0.5"/>
      <polygon points="88,50 82,47 82,53" fill={stroke} opacity="0.5"/>
    </svg>
  )
}

// 風水佈局 — Mountain & water with compass
export function FengShuiIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* Mountain */}
      <path d="M50 22 L72 65 L28 65 Z" fill="none" stroke={stroke} strokeWidth="2"/>
      <path d="M36 45 L50 22 L64 45" fill="none" stroke={stroke} strokeWidth="1" opacity="0.4"/>
      {/* Water waves */}
      <path d="M18 72 Q28 66 38 72 Q48 78 58 72 Q68 66 78 72" fill="none" stroke={stroke} strokeWidth="2" opacity="0.7"/>
      <path d="M22 80 Q32 74 42 80 Q52 86 62 80 Q72 74 82 80" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
      {/* Compass needle */}
      <circle cx="50" cy="50" r="4" fill="none" stroke={stroke} strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}

// 梅花六壬 — Plum blossom with divination lines
export function MeiHuaIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* Five petals of plum blossom */}
      <circle cx="50" cy="30" r="10" fill="none" stroke={stroke} strokeWidth="1.5"/>
      <circle cx="69" cy="42" r="10" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.8"/>
      <circle cx="62" cy="65" r="10" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.7"/>
      <circle cx="38" cy="65" r="10" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.7"/>
      <circle cx="31" cy="42" r="10" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.8"/>
      {/* Center pistil */}
      <circle cx="50" cy="48" r="5" fill={stroke} opacity="0.8"/>
      {/* Subtle trigram lines at bottom */}
      <line x1="38" y1="84" x2="48" y2="84" stroke={stroke} strokeWidth="2" opacity="0.4"/>
      <line x1="52" y1="84" x2="62" y2="84" stroke={stroke} strokeWidth="2" opacity="0.4"/>
      <line x1="38" y1="89" x2="62" y2="89" stroke={stroke} strokeWidth="2" opacity="0.3"/>
    </svg>
  )
}

// 六爻神課 — Three classical bronze coins with square holes & hexagram line
export function LiuYaoIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* Top coin */}
      <circle cx="50" cy="35" r="16" fill="none" stroke={stroke} strokeWidth="1.75"/>
      <rect x="45" y="30" width="10" height="10" rx="1" fill="none" stroke={stroke} strokeWidth="1.5"/>
      {/* Bottom left coin */}
      <circle cx="34" cy="58" r="16" fill="none" stroke={stroke} strokeWidth="1.75"/>
      <rect x="29" y="53" width="10" height="10" rx="1" fill="none" stroke={stroke} strokeWidth="1.5"/>
      {/* Bottom right coin */}
      <circle cx="66" cy="58" r="16" fill="none" stroke={stroke} strokeWidth="1.75"/>
      <rect x="61" y="53" width="10" height="10" rx="1" fill="none" stroke={stroke} strokeWidth="1.5"/>
      {/* Trigram Yao line at base */}
      <line x1="28" y1="84" x2="45" y2="84" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" opacity="0.75"/>
      <line x1="55" y1="84" x2="72" y2="84" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" opacity="0.75"/>
      <line x1="28" y1="90" x2="72" y2="90" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
    </svg>
  )
}

// 小六壬掌訣
export function XiaoLiuRenIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* Palm outline */}
      <path d="M30 75 C30 85 45 90 55 90 C70 90 75 75 75 55 L75 40 C75 35 70 35 70 40 L70 50 L70 30 C70 25 65 25 65 30 L65 50 L65 22 C65 17 60 17 60 22 L60 50 L60 28 C60 23 55 23 55 28 L55 58 L45 50 C40 46 35 50 38 56 L46 66 L42 70 C36 70 30 70 30 75 Z" fill="none" stroke={stroke} strokeWidth="1.75"/>
      {/* Six points */}
      <circle cx="48" cy="38" r="2.5" fill={stroke}/>
      <circle cx="57" cy="34" r="2.5" fill={stroke}/>
      <circle cx="66" cy="42" r="2.5" fill={stroke}/>
      <circle cx="66" cy="56" r="2.5" fill={stroke}/>
      <circle cx="57" cy="58" r="2.5" fill={stroke}/>
      <circle cx="48" cy="54" r="2.5" fill={stroke}/>
    </svg>
  )
}

// 塔羅牌陣
export function TarotIcon({ size = 24, className = '', color }: IconProps) {
  const stroke = color || '#d4a853'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      <rect x="32" y="20" width="36" height="60" rx="3" fill="none" stroke={stroke} strokeWidth="1.75"/>
      <rect x="36" y="24" width="28" height="52" rx="2" fill="none" stroke={stroke} strokeWidth="0.75" opacity="0.6"/>
      {/* Celestial Tarot emblem */}
      <circle cx="50" cy="50" r="8" fill="none" stroke={stroke} strokeWidth="1.25"/>
      <path d="M50 38 L50 62 M38 50 L62 50" stroke={stroke} strokeWidth="1" opacity="0.8"/>
      <polygon points="50,44 54,50 50,56 46,50" fill={stroke} opacity="0.9"/>
    </svg>
  )
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

// Convenience map for dynamic rendering
import YinYangIcon from './YinYangIcon'

const iconMap: Record<string, React.ComponentType<IconProps>> = {
  bazi: BaZiIcon,
  iching: YinYangIcon,
  liuyao: LiuYaoIcon,
  ziwei: ZiWeiIcon,
  qimen: QiMenIcon,
  fengshui: FengShuiIcon,
  meihua: MeiHuaIcon,
  xiaoliuren: XiaoLiuRenIcon,
  tarot: TarotIcon,
  other: ScrollIcon,
}

export function DivinationIcon({ type, size = 24, className = '', color }: { type: string } & IconProps) {
  const Icon = iconMap[type] || YinYangIcon
  return <Icon size={size} className={className} color={color} />
}
