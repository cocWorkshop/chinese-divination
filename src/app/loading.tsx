/**
 * Global route-level loading.tsx — server component (no client hooks).
 *
 * Cannot read LanguageContext (that's client-side). Loading splashes only
 * flash for ~100ms on navigation, so we stack zh + en — both audiences
 * see a string in their language regardless of how they got here.
 */
export default function GlobalLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm">載入中...</p>
        <p className="text-white/30 text-xs mt-1">Loading...</p>
      </div>
    </div>
  )
}
