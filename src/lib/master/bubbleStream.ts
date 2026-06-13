/**
 * Bubble-stream — splits a streamed assistant response into multiple chat
 * "bubbles" using an explicit marker the LLM emits between bubbles.
 *
 * Why an explicit marker (`[NEXT]`) instead of relying on `\n\n`:
 * normal markdown paragraphs use blank lines, so reusing them as a bubble
 * boundary would silently break long-form responses. The marker is rare
 * enough in natural Chinese / English prose that the model can be steered
 * to emit it only when it WANTS a new bubble (short pacing beats, e.g.
 * "嗯。" → pause → "你說，我聽著。").
 *
 * The marker is also persisted in the assistant row so the next turn the
 * model sees its own previous formatting and stays consistent. The frontend
 * splits on the marker when rendering history.
 */

export const BUBBLE_MARKER = '[NEXT]'

/**
 * Stateful streamer: feed it incoming content chunks (which may split a
 * marker across two chunks) and it emits ordered ('content' | 'break')
 * events. Caller decides what to do with each (e.g. SSE forward, accumulate,
 * etc.).
 *
 * Example:
 *   const s = new BubbleStreamer()
 *   s.push('嗯[NE', emit)              // emits content '嗯' (holds 'XT]'-prefix)
 *   s.push('XT]你說，我聽著。', emit)    // emits break, then content '你說，我聽著。'
 *   s.flush(emit)                      // no-op (buffer empty)
 */
export class BubbleStreamer {
  private buffer = ''

  push(
    chunk: string,
    onContent: (text: string) => void,
    onBreak: () => void,
  ): void {
    if (!chunk) return
    this.buffer += chunk

    // Drain all complete markers in one pass.
    while (true) {
      const idx = this.buffer.indexOf(BUBBLE_MARKER)
      if (idx < 0) break
      if (idx > 0) onContent(this.buffer.slice(0, idx))
      onBreak()
      this.buffer = this.buffer.slice(idx + BUBBLE_MARKER.length)
    }

    // Hold back any tail that could be the START of a marker — otherwise
    // we'd flash partial '[NEX' to the UI.
    const heldTail = this.markerPrefixTail()
    const safeLen = this.buffer.length - heldTail
    if (safeLen > 0) {
      onContent(this.buffer.slice(0, safeLen))
      this.buffer = this.buffer.slice(safeLen)
    }
  }

  /**
   * Stream ended — flush any remaining buffer as content. (Anything still
   * buffered at this point cannot be a marker because the stream is closed.)
   */
  flush(onContent: (text: string) => void): void {
    if (this.buffer.length > 0) {
      onContent(this.buffer)
      this.buffer = ''
    }
  }

  /**
   * Length of the longest suffix of the buffer that is a prefix of the
   * marker. e.g. buffer ending in '[NE' → returns 3 (that's a partial
   * '[NEXT]').
   */
  private markerPrefixTail(): number {
    const maxCheck = Math.min(this.buffer.length, BUBBLE_MARKER.length - 1)
    for (let len = maxCheck; len > 0; len--) {
      if (this.buffer.endsWith(BUBBLE_MARKER.slice(0, len))) return len
    }
    return 0
  }
}

/**
 * Split a stored assistant content string into bubble segments. Used when
 * loading history — the marker is preserved in storage, so on reload we
 * split here to rebuild the multi-bubble layout.
 */
export function splitBubbles(content: string): string[] {
  if (!content) return ['']
  const parts = content.split(BUBBLE_MARKER)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}
