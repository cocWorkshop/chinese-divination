/**
 * Pure decision for the divination form's query-param hydration guard.
 *
 * The form must re-seed from the URL on EVERY distinct non-empty query — not
 * just once — so a repeat Xuanji Master CTA to the SAME /divination/[type] the
 * user is already on re-applies the prefill (see ctaNav.withCtaNonce, which
 * guarantees the query changes). Extracted as a pure function so this behavior
 * is locked by a unit test (a future "optimize to one-time" would reintroduce
 * the empty-form / stuck-result bug).
 *
 * @param lastApplied the query string most recently hydrated ('' before any)
 * @param current     the current URL query string
 */
export function shouldHydrateFromQuery(lastApplied: string, current: string): boolean {
  if (current === '') return false        // no params → nothing to hydrate (draft restore handles this)
  return current !== lastApplied          // re-hydrate iff the query actually changed
}
