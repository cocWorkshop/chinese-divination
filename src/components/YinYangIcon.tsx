// Consistent yin-yang icon across all platforms (replaces ☯ emoji)
export default function YinYangIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`inline-block ${className}`} style={{ verticalAlign: 'middle' }}>
      <circle cx="50" cy="50" r="48" fill="#0a0f1e" stroke="#d4a853" strokeWidth="2"/>
      <path d="M50 2a48 48 0 0 1 0 96a24 24 0 0 1 0-48a24 24 0 0 0 0-48z" fill="#d4a853"/>
      <circle cx="50" cy="26" r="7" fill="#0a0f1e"/>
      <circle cx="50" cy="74" r="7" fill="#d4a853"/>
    </svg>
  )
}

// For use in non-component contexts (email HTML, canvas, etc.), use this inline SVG string
export const yinYangSvgDataUri = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230a0f1e" stroke="%23d4a853" stroke-width="2"/><path d="M50 2a48 48 0 0 1 0 96a24 24 0 0 1 0-48a24 24 0 0 0 0-48z" fill="%23d4a853"/><circle cx="50" cy="26" r="7" fill="%230a0f1e"/><circle cx="50" cy="74" r="7" fill="%23d4a853"/></svg>')}`
