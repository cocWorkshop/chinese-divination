// Consistent mystical SVG icons for all divination types
// Navy + gold theme, modern mystical style

interface IconProps {
  size?: number
  className?: string
}

// 八字命理 — Three trigram lines (乾卦) with mystical glow
export function BaZiIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke="#d4a853" strokeWidth="1.5" opacity="0.3"/>
      {/* Four pillars */}
      <rect x="18" y="25" width="14" height="50" rx="3" fill="none" stroke="#d4a853" strokeWidth="2"/>
      <rect x="36" y="25" width="14" height="50" rx="3" fill="none" stroke="#d4a853" strokeWidth="2"/>
      <rect x="54" y="25" width="14" height="50" rx="3" fill="none" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      <rect x="72" y="25" width="14" height="50" rx="3" fill="none" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      {/* Heavenly stems marks */}
      <line x1="22" y1="38" x2="28" y2="38" stroke="#d4a853" strokeWidth="2"/>
      <line x1="40" y1="35" x2="46" y2="35" stroke="#d4a853" strokeWidth="2"/>
      <line x1="58" y1="40" x2="64" y2="40" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      <line x1="76" y1="36" x2="82" y2="36" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      {/* Earthly branches marks */}
      <line x1="22" y1="58" x2="28" y2="58" stroke="#d4a853" strokeWidth="2"/>
      <line x1="22" y1="63" x2="28" y2="63" stroke="#d4a853" strokeWidth="2"/>
      <line x1="40" y1="58" x2="46" y2="58" stroke="#d4a853" strokeWidth="2"/>
      <line x1="40" y1="63" x2="46" y2="63" stroke="#d4a853" strokeWidth="2"/>
      <line x1="58" y1="58" x2="64" y2="58" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      <line x1="58" y1="63" x2="64" y2="63" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      <line x1="76" y1="58" x2="82" y2="58" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      <line x1="76" y1="63" x2="82" y2="63" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
    </svg>
  )
}

// 易經占卜 — Yin-Yang (reuse existing)
export { default as IChingIcon } from './YinYangIcon'

// 紫微斗數 — Star constellation / celestial chart
export function ZiWeiIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke="#d4a853" strokeWidth="1.5" opacity="0.3"/>
      {/* Central star */}
      <polygon points="50,15 56,35 78,35 60,47 67,68 50,55 33,68 40,47 22,35 44,35" fill="#d4a853" opacity="0.9"/>
      {/* Orbit rings */}
      <ellipse cx="50" cy="50" rx="38" ry="38" fill="none" stroke="#d4a853" strokeWidth="1" opacity="0.3"/>
      <ellipse cx="50" cy="50" rx="28" ry="28" fill="none" stroke="#d4a853" strokeWidth="1" opacity="0.2"/>
      {/* Constellation dots */}
      <circle cx="25" cy="70" r="2.5" fill="#d4a853" opacity="0.6"/>
      <circle cx="75" cy="70" r="2.5" fill="#d4a853" opacity="0.6"/>
      <circle cx="20" cy="40" r="2" fill="#d4a853" opacity="0.4"/>
      <circle cx="80" cy="40" r="2" fill="#d4a853" opacity="0.4"/>
      <circle cx="35" cy="82" r="1.5" fill="#d4a853" opacity="0.3"/>
      <circle cx="65" cy="82" r="1.5" fill="#d4a853" opacity="0.3"/>
    </svg>
  )
}

// 奇門遁甲 — Nine-palace grid with mystical compass feel
export function QiMenIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke="#d4a853" strokeWidth="1.5" opacity="0.3"/>
      {/* 3x3 Grid */}
      <rect x="20" y="20" width="60" height="60" rx="3" fill="none" stroke="#d4a853" strokeWidth="1.5"/>
      <line x1="40" y1="20" x2="40" y2="80" stroke="#d4a853" strokeWidth="1" opacity="0.6"/>
      <line x1="60" y1="20" x2="60" y2="80" stroke="#d4a853" strokeWidth="1" opacity="0.6"/>
      <line x1="20" y1="40" x2="80" y2="40" stroke="#d4a853" strokeWidth="1" opacity="0.6"/>
      <line x1="20" y1="60" x2="80" y2="60" stroke="#d4a853" strokeWidth="1" opacity="0.6"/>
      {/* Center door symbol */}
      <circle cx="50" cy="50" r="8" fill="none" stroke="#d4a853" strokeWidth="2"/>
      <circle cx="50" cy="50" r="3" fill="#d4a853"/>
      {/* Directional markers */}
      <polygon points="50,12 47,18 53,18" fill="#d4a853" opacity="0.7"/>
      <polygon points="50,88 47,82 53,82" fill="#d4a853" opacity="0.5"/>
      <polygon points="12,50 18,47 18,53" fill="#d4a853" opacity="0.5"/>
      <polygon points="88,50 82,47 82,53" fill="#d4a853" opacity="0.5"/>
    </svg>
  )
}

// 風水佈局 — Mountain & water with compass
export function FengShuiIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke="#d4a853" strokeWidth="1.5" opacity="0.3"/>
      {/* Mountain */}
      <path d="M50 22 L72 65 L28 65 Z" fill="none" stroke="#d4a853" strokeWidth="2"/>
      <path d="M36 45 L50 22 L64 45" fill="none" stroke="#d4a853" strokeWidth="1" opacity="0.4"/>
      {/* Water waves */}
      <path d="M18 72 Q28 66 38 72 Q48 78 58 72 Q68 66 78 72" fill="none" stroke="#d4a853" strokeWidth="2" opacity="0.7"/>
      <path d="M22 80 Q32 74 42 80 Q52 86 62 80 Q72 74 82 80" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.4"/>
      {/* Compass needle */}
      <circle cx="50" cy="50" r="4" fill="none" stroke="#d4a853" strokeWidth="1" opacity="0.5"/>
    </svg>
  )
}

// 梅花六壬 — Plum blossom with divination lines
export function MeiHuaIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke="#d4a853" strokeWidth="1.5" opacity="0.3"/>
      {/* Five petals of plum blossom */}
      <circle cx="50" cy="30" r="10" fill="none" stroke="#d4a853" strokeWidth="1.5"/>
      <circle cx="69" cy="42" r="10" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.8"/>
      <circle cx="62" cy="65" r="10" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.7"/>
      <circle cx="38" cy="65" r="10" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.7"/>
      <circle cx="31" cy="42" r="10" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.8"/>
      {/* Center pistil */}
      <circle cx="50" cy="48" r="5" fill="#d4a853" opacity="0.8"/>
      {/* Subtle trigram lines at bottom */}
      <line x1="38" y1="84" x2="48" y2="84" stroke="#d4a853" strokeWidth="2" opacity="0.4"/>
      <line x1="52" y1="84" x2="62" y2="84" stroke="#d4a853" strokeWidth="2" opacity="0.4"/>
      <line x1="38" y1="89" x2="62" y2="89" stroke="#d4a853" strokeWidth="2" opacity="0.3"/>
    </svg>
  )
}

// Convenience map for dynamic rendering
import YinYangIcon from './YinYangIcon'

const iconMap: Record<string, React.ComponentType<IconProps>> = {
  bazi: BaZiIcon,
  iching: YinYangIcon,
  ziwei: ZiWeiIcon,
  qimen: QiMenIcon,
  fengshui: FengShuiIcon,
  meihua: MeiHuaIcon,
  other: MeiHuaIcon,
}

export function DivinationIcon({ type, size = 24, className = '' }: { type: string } & IconProps) {
  const Icon = iconMap[type] || YinYangIcon
  return <Icon size={size} className={className} />
}
