/**
 * Append a unique `_cta` nonce to a Master CTA navigation URL.
 *
 * Why: clicking a CTA that targets the SAME /divination/[type] route the user
 * is already on (e.g. viewing a ziwei result, master emits another ziwei CTA)
 * is a no-op for Next.js' router when the query is identical — the flow never
 * leaves the result stage and the form is never re-seeded. The nonce guarantees
 * the query string changes on every CTA click, so the divination page's
 * searchParams effects fire (reset result → form + re-hydrate). `_cta` is not a
 * form field, so it is ignored by the param-hydration whitelist.
 */
export function withCtaNonce(url: string): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}_cta=${Date.now()}`
}
