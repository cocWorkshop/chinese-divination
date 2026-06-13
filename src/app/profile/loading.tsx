/**
 * Server-component loading.tsx — see src/app/loading.tsx for the rationale
 * on stacking zh + en (LanguageContext is client-side only).
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm">載入個人資料...</p>
        <p className="text-white/30 text-xs mt-1">Loading your profile...</p>
      </div>
    </div>
  )
}
