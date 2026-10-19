/**
 * Per-turn engine for the Xuanji Master chat.
 *
 * `runMasterTurn` is an async generator that drives one full turn of the
 * conversation:
 *   - tool-calling loop (with per-turn dedupe + runaway guard)
 *   - bubble streamer (splits content on the [NEXT] marker)
 *   - forced final synthesis (when only tool calls were emitted)
 *   - persistence (assistant row + masterSession credit-counter bump)
 *   - best-effort portrait extraction
 *
 * Yields a typed event stream the route can pipe straight into SSE. The
 * engine knows nothing about HTTP, response controllers, or auth — it
 * receives prepared inputs (compressed history, system prompt, model,
 * toolCtx) and emits events. This keeps the API route a thin adapter and
 * makes the loop unit-testable without a request.
 */

import type { Message } from '@/lib/llm'
import { streamLLM } from '@/lib/llm'
import { prisma } from '../prisma'
import { masterToolRegistry } from './tools'
import type { ToolContext } from './tools'
import { BubbleStreamer } from './bubbleStream'
import { appendMasterChatMessage, estimateTokens, loadMasterChatMessages } from './chatMessageStore'
import { maybeExtractPortrait } from './portraitExtractor'
import type { MasterMessage } from '@/types/master'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import {
  createTurnMonitor,
  isTimeoutError,
  shouldPromptExperienceFeedback,
} from './turnMonitor'

type ToolCallEntry = NonNullable<MasterMessage['toolCalls']>[number]

// ─── Engine event types — the wire shape the route forwards as SSE ─────────

export type EngineEvent =
  | { type: 'content'; text: string }
  | { type: 'bubble_break' }
  | { type: 'tool_start'; tool: string }
  | { type: 'tool_end'; tool: string }
  | { type: 'cta_card'; payload: unknown }
  | { type: 'reading_card'; payload: unknown }
  | { type: 'error'; error: string; isTimeout?: boolean }
  | { type: 'metrics'; durationMs: number; ttftMs: number | null }
  | { type: 'feedback_prompt'; reason: 'slow_response' | 'milestone' | 'timeout' }
  | { type: 'done'; durationMs?: number }

/**
 * Activation hint variants. Surface in the synthetic trigger message as
 * `[activation_trigger:HINT]` so the master persona's "## Activation" rules
 * can branch per case (cta_pending_aged / unanswered_user / ambiguous_resume
 * / long_gap_resume). `gap` is the legacy default and maps to the older
 * `[user_just_opened_chat]` synthetic for backwards compatibility.
 */
export type CheckinHint =
  | 'gap'
  | 'cta_pending_aged'
  | 'unanswered_user'
  | 'ambiguous_resume'
  | 'long_gap_resume'

export interface RunTurnInput {
  userId: string
  sessionId: string
  /**
   * True when the master is opening the conversation proactively (no user
   * message this turn). The engine appends an ephemeral synthetic user
   * message to give the LLM something to respond to — that message is NOT
   * persisted; it only exists for this one streamLLM call.
   */
  isCheckin: boolean
  /**
   * Optional hint variant for `isCheckin` turns. When omitted (or `'gap'`),
   * the synthetic injected message is the legacy `[user_just_opened_chat]`.
   * Otherwise the synthetic becomes `[activation_trigger:HINT]` so the
   * persona's activation rules can pick the right branch.
   */
  checkinHint?: CheckinHint
  /**
   * True when the master is reflecting on prior turns (no user message
   * this turn either). Mirrors `isCheckin` mechanically — both inject an
   * ephemeral synthetic user message so the LLM has a "trigger" to respond
   * to. Difference is the synthetic message tag (`[reflection_trigger]`
   * vs `[user_just_opened_chat]`); the persona prompt's reflection rules
   * key off the route's separate `## 反思時刻` appendix, not this flag.
   */
  isReflection: boolean
  systemPrompt: string
  /** Already token-budget-compressed; used as-is. */
  initialMessages: Message[]
  model: string
  toolCtx: ToolContext
  /** Primary key of the user's MasterSession row (for the credit-counter bump). */
  masterSessionPk: string
  lang: 'zh-TW' | 'en'
  /** Request-correlation id (src/lib/logger.ts) — threaded into LlmLog rows. */
  requestId?: string
  /**
   * Abort signal from the HTTP request (client disconnect). Threaded into
   * every streamLLM call so an abandoned turn stops burning tokens instead
   * of running the full tool loop into the void. Aborts surface through the
   * normal error event path; the partial turn is not persisted.
   */
  signal?: AbortSignal
  /** User's turn count in this session (used to determine periodic feedback milestone). */
  turnCount?: number
}

/** Hard cap on tool-calling iterations (runaway guard, not the primary limit — the dedupe cache is). */
const MAX_TOOL_LOOPS = 12

/** Reflection "nothing to add" sentinel — see master-appendices/reflection.md. */
export function isPassReply(content: string): boolean {
  return content.replace(/\[NEXT\]/g, '').trim().replace(/[。.\s]/g, '').toUpperCase() === '[PASS]'
}

export async function* runMasterTurn(
  input: RunTurnInput,
): AsyncGenerator<EngineEvent, void, void> {
  const monitor = createTurnMonitor({
    userId: input.userId,
    sessionId: input.sessionId,
    model: input.model,
    requestId: input.requestId,
  })

  try {
    const currentMessages: Message[] = [...input.initialMessages]

    // Checkin: master speaks first. Inject an ephemeral synthetic user
    // message so the LLM has something to respond to. NOT persisted.
    // The hint variant lets the persona's activation rules branch per
    // resume case (CTA pending, unanswered user, ambiguous, long gap).
    if (input.isCheckin) {
      const hint = input.checkinHint
      const synthetic =
        !hint || hint === 'gap'
          ? '[user_just_opened_chat]'
          : `[activation_trigger:${hint}]`
      currentMessages.push({
        role: 'user',
        content: synthetic,
      })
    } else if (input.isReflection) {
      // Same shape, different tag — gives the persona's reflection
      // section the trigger phrase it's looking for.
      currentMessages.push({
        role: 'user',
        content: '[reflection_trigger]',
      })
    }

    let assistantContent = ''
    // Splits streamed content into bubbles on the [NEXT] marker. The raw
    // marker stays in `assistantContent` so it persists to DB (the next turn
    // the model sees its own previous formatting); to the client we emit
    // `bubble_break` events instead of the literal marker text.
    const bubbleStreamer = new BubbleStreamer()
    // The bubble streamer takes synchronous emit callbacks. Since we're
    // inside an async generator, the simplest bridge is to buffer events
    // pushed by the streamer and flush them after each push. Order is
    // preserved because every push completes synchronously before we yield.
    const buffered: EngineEvent[] = []
    const emitContent = (text: string) => {
      if (text) buffered.push({ type: 'content', text })
    }
    const emitBreak = () => buffered.push({ type: 'bubble_break' })
    // Reflection turns are held back until the model finishes: if it has
    // nothing worth adding it answers `[PASS]`, and we drop the turn
    // silently rather than streaming a disconnected stock farewell.
    const holdOutput = input.isReflection
    const flushBuffered = function* (): Generator<EngineEvent> {
      if (holdOutput) return
      while (buffered.length > 0) {
        yield buffered.shift()!
      }
    }

    const allToolCalls: ToolCallEntry[] = []
    let loopCount = 0
    let hitLoopCap = false

    // Per-turn tool dedupe cache. Prevents stuck loops where the model
    // repeatedly calls the same tool with the same args. Cache key is
    // `name + JSON args`. Cache hits skip the handler entirely.
    const turnToolCache = new Map<
      string,
      Awaited<ReturnType<typeof masterToolRegistry.execute>>
    >()

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++
      const pendingToolCalls: { id: string; name: string; arguments: string }[] = []
      let contentChunk = ''
      let finishReason = ''

      for await (const chunk of streamLLM({
        endpoint: 'master',
        userId: input.userId,
        systemPrompt: input.systemPrompt,
        messages: currentMessages,
        tools: masterToolRegistry.toolDefs(),
        model: input.model,
        requestId: input.requestId,
        signal: input.signal,
      })) {
        if (chunk.type === 'content') {
          monitor.recordFirstToken()
          contentChunk += chunk.text
          assistantContent += chunk.text
          bubbleStreamer.push(chunk.text, emitContent, emitBreak)
          yield* flushBuffered()
        } else if (chunk.type === 'tool_call_delta') {
          const idx = chunk.index
          if (!pendingToolCalls[idx]) {
            pendingToolCalls[idx] = { id: chunk.id || '', name: chunk.name || '', arguments: '' }
          }
          if (chunk.id) pendingToolCalls[idx].id = chunk.id
          if (chunk.name) pendingToolCalls[idx].name = chunk.name
          if (chunk.argumentsDelta) pendingToolCalls[idx].arguments += chunk.argumentsDelta
        } else if (chunk.type === 'done') {
          finishReason = chunk.finishReason
        }
      }

      // No tool calls in this stream pass — turn is complete.
      if (finishReason !== 'tool_calls' || pendingToolCalls.length === 0) {
        break
      }

      // Last allowed iteration but model still wants tools — execute its
      // request, then break out of the while so the synthesis pass below
      // can produce visible content.
      if (loopCount >= MAX_TOOL_LOOPS) {
        hitLoopCap = true
      }

      // Emit the assistant's tool-call request message to the LLM history.
      currentMessages.push({
        role: 'assistant',
        content: contentChunk || null,
        tool_calls: pendingToolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      })

      for (const tc of pendingToolCalls) {
        yield { type: 'tool_start', tool: tc.name }

        let args: unknown = {}
        try {
          args = JSON.parse(tc.arguments || '{}')
        } catch {
          /* leave as {} — registry will return INVALID_INPUT */
        }

        const cacheKey = `${tc.name}::${tc.arguments || '{}'}`
        let result = turnToolCache.get(cacheKey)
        if (!result) {
          const toolStart = Date.now()
          result = await masterToolRegistry.execute(tc.name, args, input.toolCtx)
          monitor.recordToolExecution(tc.name, Date.now() - toolStart)
          turnToolCache.set(cacheKey, result)
        }

        // Surface navigation intent: prefill_divination_form → cta_card event
        // (clickable card linking to a pre-filled new-reading form).
        if (
          tc.name === 'prefill_divination_form' &&
          result.ok &&
          result.data &&
          typeof result.data === 'object'
        ) {
          yield { type: 'cta_card', payload: result.data }
        }

        // show_reading_card → reading_card event (clickable reference to an
        // existing reading; visually distinct from cta_card).
        if (
          tc.name === 'show_reading_card' &&
          result.ok &&
          result.data &&
          typeof result.data === 'object'
        ) {
          yield { type: 'reading_card', payload: result.data }
        }

        allToolCalls.push({
          name: tc.name,
          args:
            typeof args === 'object' && args
              ? (args as Record<string, unknown>)
              : {},
          result,
        })

        yield { type: 'tool_end', tool: tc.name }

        // Feed the tool result back to the model as a 'tool' role message.
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }

      if (hitLoopCap) break
    }

    // Forced final synthesis: if no visible content was produced (long tool
    // chain, or hit the loop cap), do one more pass WITHOUT tools so the
    // model is obligated to respond in prose. Without this, a long
    // tool-calling turn ends with an empty assistant bubble.
    if (assistantContent.trim().length === 0) {
      for await (const chunk of streamLLM({
        endpoint: 'master',
        userId: input.userId,
        systemPrompt: input.systemPrompt,
        messages: currentMessages,
        model: input.model,
        requestId: input.requestId,
        signal: input.signal,
        // No `tools` — forces prose.
      })) {
        if (chunk.type === 'content') {
          monitor.recordFirstToken()
          assistantContent += chunk.text
          bubbleStreamer.push(chunk.text, emitContent, emitBreak)
          yield* flushBuffered()
        }
      }
    }

    // Release any tail held by the bubble streamer (a partial '[NE' that
    // never resolved into a marker, etc.).
    bubbleStreamer.flush(emitContent)
    yield* flushBuffered()

    if (holdOutput) {
      if (isPassReply(assistantContent)) {
        // Nothing worth adding — end silently: no bubble, no persisted row.
        buffered.length = 0
        yield { type: 'done', durationMs: monitor.finish().totalDurationMs }
        return
      }
      while (buffered.length > 0) yield buffered.shift()!
    }

    // Persist the assistant turn.
    await appendMasterChatMessage({
      userId: input.userId,
      sessionId: input.sessionId,
      role: 'assistant',
      content: assistantContent,
      toolCallsJson:
        allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null,
      tokenCount: estimateTokens(assistantContent),
    })

    // Bump per-user master usage counter (exempting server-initiated checkin/reflection, AUD-01).
    if (!input.isCheckin && !input.isReflection) {
      await prisma.masterSession.update({
        where: { id: input.masterSessionPk },
        data: { totalCreditsUsed: { increment: 1 } },
      })
    }

    const metrics = monitor.finish()
    logger.info(
      {
        masterMetrics: metrics,
        requestId: input.requestId,
        userId: input.userId,
        sessionId: input.sessionId,
      },
      `[turnEngine] master turn completed in ${metrics.totalDurationMs}ms (TTFT: ${metrics.ttftMs ?? 0}ms)`
    )

    yield {
      type: 'metrics',
      durationMs: metrics.totalDurationMs,
      ttftMs: metrics.ttftMs,
    }

    const feedbackDecision = shouldPromptExperienceFeedback({
      metrics,
      turnCount: input.turnCount,
    })
    if (feedbackDecision.shouldPrompt && feedbackDecision.reason) {
      yield { type: 'feedback_prompt', reason: feedbackDecision.reason }
    }

    // Emit done before the (potentially slow) portrait extraction so the
    // client can stop reading. The generator continues until extraction
    // finishes — that work is best-effort and adds no visible latency.
    yield { type: 'done', durationMs: metrics.totalDurationMs }

    try {
      const allRowsAfter = await loadMasterChatMessages(input.userId, input.sessionId)
      const latestTurnIndex =
        allRowsAfter.length > 0
          ? Math.max(...allRowsAfter.map((r) => r.turnIndex))
          : 0
      await maybeExtractPortrait({
        userId: input.userId,
        sessionId: input.sessionId,
        currentTurnIndex: latestTurnIndex,
        lang: input.lang,
      })
    } catch (extractErr) {
      console.error('[turnEngine] portrait extraction failed:', extractErr)
    }
  } catch (err) {
    const isTimeout = isTimeoutError(err, input.signal)
    const metrics = monitor.finish({ isTimeout })
    console.error(`[turnEngine] ${isTimeout ? 'TIMEOUT' : 'error'}:`, err, metrics)
    logger.error(
      {
        err,
        masterMetrics: metrics,
        isTimeout,
        requestId: input.requestId,
        userId: input.userId,
        sessionId: input.sessionId,
      },
      `[turnEngine] master turn failed (isTimeout=${isTimeout}) after ${metrics.totalDurationMs}ms`
    )

    if (isTimeout) {
      Sentry.captureException(err, {
        tags: { endpoint: 'master', isTimeout: 'true', requestId: input.requestId },
        extra: { metrics },
      })
    }

    const errorText = isTimeout
      ? (input.lang === 'en'
          ? 'Master consultation timed out. Please try asking again.'
          : '玄機大師推演超時，請重新向大師提問。')
      : (err instanceof Error ? err.message : 'Unknown error')

    yield {
      type: 'error',
      error: errorText,
      isTimeout,
    }

    if (isTimeout) {
      yield { type: 'feedback_prompt', reason: 'timeout' }
    }
  }
}
