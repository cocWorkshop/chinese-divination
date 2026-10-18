/**
 * Starfield — pure-CSS twinkling backdrop for the /start funnel.
 *
 * Renders ~60 fixed-position stars across the viewport. Each twinkles via
 * a CSS keyframe with a deterministic delay. No requestAnimationFrame, no
 * Canvas — keeps mobile CPU at zero. The seed is a hash of index so SSR
 * and hydration produce identical positions (no flicker).
 *
 * Designed to sit in the layout's absolute layer behind page content. The
 * pointer-events-none + z-0 means it never interferes with clicks.
 */

const STAR_COUNT = 60

// Deterministic pseudo-random — tiny xorshift seeded by index so SSR/CSR match.
function rand(i: number, salt: number): number {
  let x = (i * 73856093) ^ (salt * 19349663)
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return ((x >>> 0) % 10000) / 10000
}

interface Star {
  top: string
  left: string
  size: number
  delay: number
  duration: number
}

function makeStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    const r1 = rand(i, 1)
    const r2 = rand(i, 2)
    const r3 = rand(i, 3)
    const r4 = rand(i, 4)
    return {
      top: `${(r1 * 100).toFixed(2)}%`,
      left: `${(r2 * 100).toFixed(2)}%`,
      size: 1 + r3 * 1.6, // 1–2.6 px
      delay: r4 * 6, // 0–6s stagger
      duration: 4 + r3 * 4, // 4–8s
    }
  })
}

const STARS = makeStars()

export default function Starfield() {
  return (
    <div
      aria-hidden
      className="xj-stars pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.08) 0%, transparent 55%)',
      }}
    >
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: '#e8d49a',
            boxShadow: '0 0 4px rgba(232,212,154,0.6)',
            animation: `xjStarTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes xjStarTwinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.85); }
          50% { opacity: 0.85; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
