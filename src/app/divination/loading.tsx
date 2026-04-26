/**
 * Server-component loading.tsx — see src/app/loading.tsx for the rationale
 * on stacking zh + en (LanguageContext is client-side only).
 */
export default function DivinationLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">☯</div>
        <p className="text-white/50 text-sm">正在準備占卜...</p>
        <p className="text-white/30 text-xs mt-1">Preparing your divination...</p>
      </div>
    </div>
  )
}
