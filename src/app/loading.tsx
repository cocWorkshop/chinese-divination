/**
 * Global route-level loading.tsx — server component (no client hooks).
 *
 * Cannot read LanguageContext (that's client-side). Loading splashes only
 * flash for ~100ms on navigation, so we stack zh + en — both audiences
 * see a string in their language regardless of how they got here.
 */
export default function GlobalLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center relative">
        {/* Subtle radial golden glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gold/10 blur-2xl pointer-events-none" />

        {/* Oriental celestial ring */}
        <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-gold/20 border-t-gold animate-spin" style={{ animationDuration: '2.5s' }} />
          <div className="absolute inset-2 rounded-full border border-dashed border-gold/30 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_rgba(212,168,83,0.8)] animate-pulse" />
        </div>

        <p className="text-gold font-serif text-base tracking-widest font-medium">天機推衍中</p>
        <p className="text-[var(--text-muted)] text-xs mt-1 tracking-wide font-sans">Aligning Celestial Patterns...</p>
      </div>
    </div>
  )
}
