/**
 * Typed cross-component event bus over window CustomEvents (plan I14).
 *
 * Replaces ad-hoc `window.dispatchEvent(new CustomEvent('xuanji:…'))` /
 * `addEventListener` pairs: payloads are typed per event name, and listener
 * exceptions are isolated (a throwing subscriber can no longer kill the
 * dispatching code path — CustomEvent listeners run synchronously inside
 * dispatchEvent).
 *
 * Event vocabulary (the master widget is the main consumer):
 *   - xuanji:readingComplete       a divination reading finished saving;
 *                                  the master swaps its CTA card + reacts
 *   - xuanji:readingsChanged       readings were deleted/changed elsewhere;
 *                                  the master refreshes greeting hints
 *   - xuanji:portraitEnabledChanged the portrait feature toggle flipped
 */

export interface XuanjiEventMap {
  'xuanji:readingComplete': { readingId: string; type: string }
  'xuanji:readingsChanged': undefined
  'xuanji:portraitEnabledChanged': { enabled: boolean }
}

export function publish<K extends keyof XuanjiEventMap>(
  name: K,
  ...detail: XuanjiEventMap[K] extends undefined ? [] : [XuanjiEventMap[K]]
): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(name, { detail: detail[0] }))
}

/** Subscribe; returns the unsubscribe function (hand it to useEffect cleanup). */
export function subscribe<K extends keyof XuanjiEventMap>(
  name: K,
  handler: (detail: XuanjiEventMap[K]) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (e: Event) => {
    try {
      handler((e as CustomEvent).detail as XuanjiEventMap[K])
    } catch (err) {
      // Isolation: a throwing subscriber must not propagate into the
      // synchronous dispatchEvent call site (e.g. the divination save path).
      console.error(`[events] subscriber for ${name} threw`, err)
    }
  }
  window.addEventListener(name, listener)
  return () => window.removeEventListener(name, listener)
}
