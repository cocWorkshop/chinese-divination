/**
 * Path-aware streaming JSON parser.
 *
 * Feed it LLM output chunk-by-chunk; it emits ordered events as the JSON
 * structure is uncovered:
 *
 *   - { type: 'value_chunk', path, text }   — chars arriving inside a
 *                                              string value (path-tagged
 *                                              so the renderer can route
 *                                              them to the right section).
 *   - { type: 'value_done', path, value }   — a value (string OR primitive)
 *                                              just finished. `value` is
 *                                              the fully assembled value.
 *   - { type: 'done' }                      — outermost `}` or `]` closed.
 *   - { type: 'error', error }              — malformed input encountered.
 *
 * Why custom (not stream-json or @streamparser/json):
 *   - Native, zero deps, stays vendored
 *   - Path tracking is ergonomic for our nested handler schemas
 *   - Tolerant of leading garbage (` ```json ` fences, prose before `{`)
 *
 * The parser does NOT reject syntactically invalid trailing content — once
 * the outermost brace closes, it emits `done` and ignores any tail. Mid-
 * stream syntax errors fire `error` and stop further events.
 */

export type JsonPath = (string | number)[]

export interface ValueChunkEvent {
  type: 'value_chunk'
  path: JsonPath
  text: string
}
export interface ValueDoneEvent {
  type: 'value_done'
  path: JsonPath
  value: string | number | boolean | null
}
export interface DoneEvent {
  type: 'done'
}
export interface ErrorEvent {
  type: 'error'
  error: string
}
export type ParserEvent = ValueChunkEvent | ValueDoneEvent | DoneEvent | ErrorEvent

type EmitFn = (event: ParserEvent) => void

interface StackFrame {
  kind: 'object' | 'array'
  /** Object-only — the current property key whose value is being parsed. */
  key: string | null
  /** Array-only — the next index to assign. */
  index: number
}

type Mode =
  | 'preDoc'        // before the outermost `{` / `[`
  | 'postDoc'       // after the outermost close — silently ignore tail
  | 'expectKey'     // inside an object, expecting `"key"` or `}`
  | 'inKey'         // accumulating chars of a key
  | 'afterKey'      // key buffered, expecting `:`
  | 'expectValue'   // saw `:` (or array entry), expecting a value
  | 'inStringValue' // accumulating chars of a string value (emitting!)
  | 'inLiteral'     // accumulating non-string primitive (number/true/false/null)
  | 'afterValue'    // value finished, expecting `,` or container close
  | 'errored'

export class StreamingJsonParser {
  private mode: Mode = 'preDoc'
  private stack: StackFrame[] = []
  private buffer = ''         // active key OR string-value chars
  private literalBuf = ''     // active number/bool/null chars
  private escape = false      // last char was `\` inside a string
  private pendingChunk = ''   // unflushed string-value chars (see queueChunk)

  push(input: string, emit: EmitFn): void {
    if (this.isStopped()) return
    for (let i = 0; i < input.length; i++) {
      this.consumeChar(input[i], emit)
      if (this.isStopped()) return
    }
    // One value_chunk per push (= per LLM delta) instead of one per
    // character: a typical reading streams ~25-30K chars, and per-char
    // events meant ~30K SSE frames (~3MB framing overhead) per reading.
    // Flushing at the push boundary preserves the live-typing granularity —
    // deltas arrive exactly as often as the provider sends them.
    this.flushChunk(emit)
  }

  private isStopped(): boolean {
    return this.mode === 'errored' || this.mode === 'postDoc'
  }

  /**
   * Stream finished — flush any open primitive literal (numbers / bools /
   * null are only complete when followed by a delimiter). Strings that
   * weren't closed are reported as a parse error.
   */
  end(emit: EmitFn): void {
    if (this.mode === 'inLiteral') {
      this.finishLiteral(emit)
    }
    if (this.mode === 'inStringValue' || this.mode === 'inKey') {
      this.fail('unterminated string at end of input', emit)
      return
    }
    if (this.stack.length > 0 && this.mode !== 'postDoc') {
      // Truncated mid-document — emit done so the consumer can finalize, but
      // note the truncation. Callers still validate the parsed object via
      // their normal Zod path; we just don't pretend the stream was clean.
      emit({ type: 'error', error: 'truncated input' })
      this.mode = 'errored'
      return
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  private consumeChar(ch: string, emit: EmitFn): void {
    switch (this.mode) {
      case 'preDoc':
        if (ch === '{' || ch === '[') {
          this.stack.push({ kind: ch === '{' ? 'object' : 'array', key: null, index: 0 })
          this.mode = ch === '{' ? 'expectKey' : 'expectValue'
        }
        // Anything else (whitespace, prose, ` ```json `): ignore.
        return

      case 'expectKey':
        if (isWs(ch) || ch === ',') return
        if (ch === '"') {
          this.buffer = ''
          this.escape = false
          this.mode = 'inKey'
          return
        }
        if (ch === '}') {
          this.closeFrame(emit)
          return
        }
        return this.fail(`unexpected ${JSON.stringify(ch)} expecting object key`, emit)

      case 'inKey':
        if (this.escape) {
          this.buffer += unescape(ch)
          this.escape = false
          return
        }
        if (ch === '\\') { this.escape = true; return }
        if (ch === '"') {
          this.stack[this.stack.length - 1].key = this.buffer
          this.buffer = ''
          this.mode = 'afterKey'
          return
        }
        this.buffer += ch
        return

      case 'afterKey':
        if (isWs(ch)) return
        if (ch === ':') { this.mode = 'expectValue'; return }
        return this.fail(`unexpected ${JSON.stringify(ch)} expecting ':'`, emit)

      case 'expectValue':
        if (isWs(ch) || ch === ',') return
        if (ch === '"') {
          this.buffer = ''
          this.escape = false
          this.mode = 'inStringValue'
          return
        }
        if (ch === '{' || ch === '[') {
          this.stack.push({ kind: ch === '{' ? 'object' : 'array', key: null, index: 0 })
          this.mode = ch === '{' ? 'expectKey' : 'expectValue'
          return
        }
        if (ch === ']') {
          // Empty array closure: `[]`
          this.closeFrame(emit)
          return
        }
        // Start of a primitive literal (digits / `-` / `t` / `f` / `n`).
        this.literalBuf = ch
        this.mode = 'inLiteral'
        return

      case 'inStringValue': {
        if (this.escape) {
          const decoded = unescape(ch)
          this.buffer += decoded
          this.queueChunk(decoded)
          this.escape = false
          return
        }
        if (ch === '\\') { this.escape = true; return }
        if (ch === '"') {
          // Value done. Flush any batched chars first so the chunk stream
          // precedes value_done for this path.
          this.flushChunk(emit)
          emit({ type: 'value_done', path: this.currentPath(), value: this.buffer })
          this.buffer = ''
          this.afterValue(emit)
          return
        }
        this.buffer += ch
        this.queueChunk(ch)
        return
      }

      case 'inLiteral':
        // Literal continues until we hit a delimiter.
        if (isLiteralChar(ch)) {
          this.literalBuf += ch
          return
        }
        // Delimiter — finalize the literal, then re-process this delimiter.
        this.finishLiteral(emit)
        if (this.isStopped()) return
        this.consumeChar(ch, emit)
        return

      case 'afterValue':
        if (isWs(ch)) return
        if (ch === ',') {
          // Bump array index (object case is keyed — irrelevant here).
          const top = this.stack[this.stack.length - 1]
          if (top?.kind === 'array') top.index += 1
          this.mode = top?.kind === 'array' ? 'expectValue' : 'expectKey'
          return
        }
        if (ch === '}' || ch === ']') {
          this.closeFrame(emit)
          return
        }
        return this.fail(`unexpected ${JSON.stringify(ch)} after value`, emit)
    }
  }

  private finishLiteral(emit: EmitFn): void {
    const raw = this.literalBuf
    this.literalBuf = ''
    let value: string | number | boolean | null
    if (raw === 'true') value = true
    else if (raw === 'false') value = false
    else if (raw === 'null') value = null
    else if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw)) value = Number(raw)
    else { this.fail(`invalid literal: ${JSON.stringify(raw)}`, emit); return }
    emit({ type: 'value_done', path: this.currentPath(), value })
    this.afterValue(emit)
  }

  /**
   * Path of the value currently being filled. For object frames, the path
   * component is the most recently parsed key. For array frames, it's the
   * frame's current index. The current frame's *own* key/index is included
   * because the value belongs INSIDE that frame.
   */
  private currentPath(): JsonPath {
    const path: JsonPath = []
    // Walk parent frames; each contributes one path component (its own
    // key/index — the position THIS frame occupies in its parent).
    for (let i = 1; i < this.stack.length; i++) {
      const f = this.stack[i - 1]
      if (f.kind === 'object') path.push(f.key ?? '')
      else path.push(f.index)
    }
    // The current frame's key (if object) or current index (if array) is
    // the path component for the value currently being assigned.
    const top = this.stack[this.stack.length - 1]
    if (!top) return path
    if (top.kind === 'object') path.push(top.key ?? '')
    else path.push(top.index)
    return path
  }

  /** Batch string-value chars; flushed per push() / at value close. */
  private queueChunk(text: string): void {
    if (!text) return
    this.pendingChunk += text
  }

  private flushChunk(emit: EmitFn): void {
    if (!this.pendingChunk) return
    emit({ type: 'value_chunk', path: this.currentPath(), text: this.pendingChunk })
    this.pendingChunk = ''
  }

  private afterValue(emit: EmitFn): void {
    if (this.stack.length === 0) {
      // Outermost value already closed via closeFrame; this branch is for
      // primitive root documents (rare, but handle gracefully).
      this.mode = 'postDoc'
      emit({ type: 'done' })
      return
    }
    this.mode = 'afterValue'
  }

  private closeFrame(emit: EmitFn): void {
    this.stack.pop()
    if (this.stack.length === 0) {
      this.mode = 'postDoc'
      emit({ type: 'done' })
      return
    }
    this.mode = 'afterValue'
  }

  private fail(message: string, emit: EmitFn): void {
    this.mode = 'errored'
    emit({ type: 'error', error: message })
  }
}

// ─────────────────────────────────────────────────────────────────────────

function isWs(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
}

function isLiteralChar(ch: string): boolean {
  // Anything that can appear in a number / true / false / null. Any other
  // char delimits the literal.
  return (
    (ch >= '0' && ch <= '9') ||
    ch === '-' || ch === '+' || ch === '.' ||
    ch === 'e' || ch === 'E' ||
    ch === 't' || ch === 'r' || ch === 'u' ||
    ch === 'f' || ch === 'a' || ch === 'l' || ch === 's' ||
    ch === 'n'
  )
}

function unescape(ch: string): string {
  switch (ch) {
    case 'n': return '\n'
    case 't': return '\t'
    case 'r': return '\r'
    case 'b': return '\b'
    case 'f': return '\f'
    case '"': return '"'
    case "'": return "'"
    case '\\': return '\\'
    case '/': return '/'
    default: return ch
  }
}
