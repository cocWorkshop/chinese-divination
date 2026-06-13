/**
 * Canonical i18n helpers — single home for the bilingual (zh-TW / en)
 * utilities that were previously copy-pasted per file (~34 local `const T`
 * definitions before consolidation).
 *
 * Conventions:
 * - `T(lang, zh, en)` — inline bilingual text. The codebase's established
 *   pattern; both translations live at the call site, which keeps them in
 *   sync with the surrounding code. Import THIS one; do not redeclare.
 * - `formatDate` / `formatDateTime` / `formatNumber` — locale-aware
 *   formatting via Intl. Use these instead of raw `toLocaleString()` calls
 *   without a locale (those follow the SERVER/browser default, not the
 *   user's chosen language).
 * - New code should not write raw `lang === 'en' ? … : …` ternaries —
 *   use `T()` so usages stay greppable/auditable.
 */

export type Lang = 'zh-TW' | 'en'

/** Inline bilingual text helper. `lang` is the LanguageContext value. */
export const T = (lang: string, zhTW: string, en: string): string =>
  lang === 'en' ? en : zhTW

/** Map the LanguageContext lang to a BCP-47 locale for Intl APIs. */
export const toLocale = (lang: string): string => (lang === 'en' ? 'en-US' : 'zh-TW')

/** Locale-aware date (no time), e.g. "2026/6/12" / "6/12/2026". */
export function formatDate(date: Date | string | number, lang: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(toLocale(lang), options ?? { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(date))
}

/** Locale-aware date + time, e.g. "2026/6/12 下午2:30" / "6/12/2026, 2:30 PM". */
export function formatDateTime(date: Date | string | number, lang: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(
    toLocale(lang),
    options ?? { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  ).format(new Date(date))
}

/** Locale-aware number formatting (thousands separators etc.). */
export function formatNumber(value: number, lang: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(toLocale(lang), options).format(value)
}
