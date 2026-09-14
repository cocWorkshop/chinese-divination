'use client'

interface ChartSkeletonProps {
  type?: string
  className?: string
}

export default function ChartSkeleton({ type = 'bazi', className = '' }: ChartSkeletonProps) {
  const isGridChart = type === 'ziwei' || type === 'qimen'

  return (
    <div className={`oriental-sanctuary-card rounded-2xl p-4 sm:p-6 border border-gold/20 relative overflow-hidden animate-pulse ${className}`}>
      {/* Background celestial glow watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

      {/* Header bar placeholder */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-gold/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-gold/30" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-gold/20 rounded-md" />
            <div className="h-3 w-40 bg-white/10 rounded-md" />
          </div>
        </div>
        <div className="h-6 w-20 bg-gold/15 border border-gold/25 rounded-full" />
      </div>

      {/* Main Chart Grid Skeleton */}
      {isGridChart ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
          {Array.from({ length: type === 'qimen' ? 9 : 12 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-gold/15 bg-white/[0.02] flex flex-col justify-between h-20 sm:h-24"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-8 bg-gold/25 rounded" />
                <div className="h-2.5 w-4 bg-white/15 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-3 w-12 bg-white/20 rounded mx-auto" />
                <div className="h-2 w-10 bg-gold/20 rounded mx-auto" />
              </div>
              <div className="h-2 w-full bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-4 border border-gold/20 mb-6">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
            {['時柱', '日柱', '月柱', '年柱'].map((label) => (
              <div key={label} className="p-3 rounded-xl bg-gold/5 border border-gold/15 space-y-2.5">
                <div className="h-3 w-10 bg-gold/25 rounded mx-auto" />
                <div className="h-7 w-8 bg-gold/30 rounded-md mx-auto" />
                <div className="h-7 w-8 bg-gold/30 rounded-md mx-auto" />
                <div className="h-2.5 w-12 bg-white/15 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shimmering Section Drawers Placeholder */}
      <div className="space-y-3">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-gold/15 bg-white/[0.02] flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-gold/40" />
              <div className="h-3.5 w-24 bg-gold/20 rounded" />
            </div>
            <div className="h-3 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>

      {/* Subtle bottom oracle note */}
      <div className="mt-6 pt-4 border-t border-gold/10 flex items-center justify-center gap-2 text-gold/60 text-xs font-serif">
        <span className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-ping" />
        <span>天地氣數凝聚，玄機神煞推衍中…</span>
      </div>
    </div>
  )
}
