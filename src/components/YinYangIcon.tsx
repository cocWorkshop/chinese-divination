// Consistent yin-yang icon across all platforms (replaces ☯ emoji)
// Dual-theme oriental sanctuary palette:
// Dark Mode: Radiance Gold Yang + Deep Void Navy Yin
// Light Mode: Radiance Gold Yang + Dunhuang Deep Ink Yin (#23180c)
export default function YinYangIcon({
  size = 24,
  className = '',
  color,
}: {
  size?: number
  className?: string
  color?: string
}) {
  const stroke = color || 'currentColor'
  const colorClass = color ? '' : (className.includes('text-') ? '' : 'text-gold')
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`inline-block ${colorClass} ${className}`.trim()}
      style={{ verticalAlign: 'middle' }}
    >
      {/* Base circle: Yin fish (Dunhuang deep ink in light mode, Void navy in dark mode) */}
      <circle
        cx="50"
        cy="50"
        r="48"
        className="fill-[#23180c] dark:fill-navy-950"
        stroke={stroke}
        strokeWidth="2.5"
      />
      {/* Yang fish: Radiance Gold */}
      <path
        d="M50 2a48 48 0 0 1 0 96a24 24 0 0 1 0-48a24 24 0 0 0 0-48z"
        fill={stroke}
      />
      {/* Eye of Yin fish: Gold (Yang within Yin) */}
      <circle cx="50" cy="26" r="6.5" fill={stroke} />
      {/* Eye of Yang fish: Deep Ink / Void (Yin within Yang) */}
      <circle
        cx="50"
        cy="74"
        r="6.5"
        className="fill-[#23180c] dark:fill-navy-950"
      />
    </svg>
  )
}

// For use in non-component contexts (email HTML, canvas, etc.), use this inline SVG string
export const yinYangSvgDataUri = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230a0f1e" stroke="%23d4a853" stroke-width="2.5"/><path d="M50 2a48 48 0 0 1 0 96a24 24 0 0 1 0-48a24 24 0 0 0 0-48z" fill="%23d4a853"/><circle cx="50" cy="26" r="6.5" fill="%23d4a853"/><circle cx="50" cy="74" r="6.5" fill="%230a0f1e"/></svg>'
)}`
