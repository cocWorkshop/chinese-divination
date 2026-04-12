export const dynamic = 'force-dynamic'
export const maxDuration = 600

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkCredits, deductCredits } from '@/lib/rateLimit'
import { streamLLM, resolveLLMConfig } from '@/lib/llm'
import type { Message } from '@/lib/llm'
import type { MasterMessage } from '@/types/master'

/**
 * Local alias for the assistant tool-call list shape we collect during the
 * stream loop. Mirrors what MasterMessage.toolCalls used to hold in the
 * legacy storage format. Phase 6 dropped the legacy MasterMessage[] history
 * array entirely; this alias is the only reason we still import the type.
 */
type ToolCallEntry = NonNullable<MasterMessage['toolCalls']>[number]
import { masterToolRegistry, buildMasterSystemPrompt } from '@/lib/master'
import type { ToolContext } from '@/lib/master'
import {
  appendMasterChatMessage,
  loadMasterChatMessages,
  estimateTokens,
  getActiveSessionId,
  generateSessionId,
  deleteAllMasterChatMessages,
} from '@/lib/master/chatMessageStore'
import { compressHistory } from '@/lib/master/compression'
import { loadPortrait, deletePortrait } from '@/lib/master/portraitStore'
import { renderPersonalizedPrompt } from '@/lib/master/personalizedPrompt'
import { maybeExtractPortrait } from '@/lib/master/portraitExtractor'

// ---------------------------------------------------------------------------
// POST — main master chat turn.
// Flow: auth → credit check → load session → build system prompt from registry
// → stream LLM → dispatch tool calls through masterToolRegistry.execute()
// → save session → return SSE stream.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return jsonError('Unauthorized', 401)
    }
    const userId = session.user.id

    const { message } = await req.json()
    if (!message || typeof message !== 'string') return jsonError('Missing message', 400)
    if (message.length > 2000) return jsonError('Message too long (max 2000)', 400)

    // Credit check (not yet deducted)
    const creditCheck = await checkCredits(userId, 'master')
    if (!creditCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `✨ 機緣不足（需要 ${creditCheck.cost}，剩餘 ${creditCheck.remaining}）。前往機緣商店補充，即可繼續提問。`,
          remaining: creditCheck.remaining,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return jsonError('🔧 玄機尚未啟動，請聯繫管理員。', 503)
    }

    // Resolve user language preference + current date/time. Uses raw SQL
    // because the new columns (portraitEnabled, masterMemoryDisclosureSeenAt)
    // aren't in the generated client until the dev server is restarted.
    const userRows = await prisma.$queryRawUnsafe<
      Array<{ language: string | null }>
    >(`SELECT "language" FROM "User" WHERE "id" = $1`, userId)
    const lang: 'zh-TW' | 'en' = userRows[0]?.language === 'en' ? 'en' : 'zh-TW'
    const currentDateTime = new Date().toISOString()

    // Load or create MasterSession (messages only — portrait is no longer
    // mutated by tools; any legacy portrait row is left untouched).
    let masterSession = await prisma.masterSession.findUnique({ where: { userId } })
    if (!masterSession) {
      masterSession = await prisma.masterSession.create({
        data: { userId, messages: '[]', portrait: null },
      })
    }

    // Phase 6: legacy history JSON read removed entirely. Canonical source
    // is MasterChatMessage. The deprecated MasterSession.portrait field is
    // still consulted as a back-compat fallback for users whose UserPortrait
    // row doesn't exist yet (the row will be populated by the next extraction).
    const legacyPortrait = masterSession.portrait
      ? safeExtractPortraitSummary(masterSession.portrait)
      : null

    // Phase 5: derive sessionId from the latest active row, or generate
    // a fresh one if there are no active rows (brand new user OR just
    // soft-reset via "Start new session"). The first interaction in a
    // new session begins a fresh sessionId — old archived rows stay put
    // for the audit trail / GDPR export but are never re-read.
    let sessionId = await getActiveSessionId(userId)
    if (!sessionId) sessionId = generateSessionId()

    // Append the user turn to MasterChatMessage. Best-effort.
    await appendMasterChatMessage({
      userId,
      sessionId,
      role: 'user',
      content: message,
      tokenCount: estimateTokens(message),
    })

    // ─── Phase 4: load portrait + render personalized prompt block ──────
    // Loaded once per turn. If portraitEnabled is false or the portrait is
    // missing/empty, personalizedPrompt is null and the system prompt
    // composer omits the block entirely (cold-start path).
    const portraitRow = await loadPortrait(userId)
    let personalizedPrompt: string | null = null
    if (portraitRow) {
      personalizedPrompt =
        portraitRow.generatedPrompt ??
        renderPersonalizedPrompt(
          {
            topics: portraitRow.topics,
            preferences: portraitRow.preferences,
            lifeContext: portraitRow.lifeContext,
            toneNotes: portraitRow.toneNotes,
          },
          lang,
        )
    }

    // Compose system prompt from persona + registry catalogs + personalized
    // block + dynamic ctx.
    const systemPrompt = buildMasterSystemPrompt({
      lang,
      currentDateTime,
      portrait: legacyPortrait,
      personalizedPrompt,
    })

    // Resolve model once, reused across tool-call loop iterations.
    const { model } = await resolveLLMConfig({ endpoint: 'master' })

    // ─── Phase 3: build initial messages from MasterChatMessage + compress ───
    // Read all non-archived rows for this session (includes the user turn we
    // just wrote above), then run compressHistory which converts rows to LLM
    // messages and applies token-budget compression if needed.
    const storedRows = await loadMasterChatMessages(userId, sessionId)
    const compressed = await compressHistory(storedRows, {
      userId,
      systemPrompt,
      model,
    })
    const initialMessages: Message[] = compressed.messages
    if (compressed.summarized) {
      console.log(`[master] history compressed (~${compressed.estimatedTokens} tokens)`)
    }

    // Deduct credit before streaming (matches prior behaviour).
    const deducted = await deductCredits(userId, 'master')
    if (!deducted) return jsonError('Failed to deduct credits', 429)

    const toolCtx: ToolContext = { userId, lang, prisma }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const currentMessages: Message[] = [...initialMessages]
          let assistantContent = ''
          const allToolCalls: ToolCallEntry[] = []
          let loopCount = 0
          // 12 iterations is a runaway guard, not the primary work bound. The
          // dedupe cache below is what actually limits work — identical
          // (name, args) calls within a turn return the cached result without
          // re-invoking the handler.
          const maxLoops = 12
          let hitLoopCap = false

          // ─── Phase 3: per-turn tool dedupe cache ─────────────────────────
          // Prevents stuck loops where the model repeatedly calls the same
          // tool with the same args. The cache key is `name + JSON args`.
          // Cache hits skip the handler entirely and reuse the cached result.
          const turnToolCache = new Map<string, Awaited<ReturnType<typeof masterToolRegistry.execute>>>()

          while (loopCount < maxLoops) {
            loopCount++
            const pendingToolCalls: { id: string; name: string; arguments: string }[] = []
            let contentChunk = ''
            let finishReason = ''

            for await (const chunk of streamLLM({
              endpoint: 'master',
              userId,
              systemPrompt,
              messages: currentMessages,
              tools: masterToolRegistry.toolDefs(),
              model,
            })) {
              if (chunk.type === 'content') {
                contentChunk += chunk.text
                assistantContent += chunk.text
                send({ type: 'content', text: chunk.text })
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

            // If no tool calls in this stream pass, we're done.
            if (finishReason !== 'tool_calls' || pendingToolCalls.length === 0) {
              break
            }

            // If this was the last allowed iteration and the model still wants
            // tools, remember to synthesize below so we don't end with empty
            // content.
            if (loopCount >= maxLoops) {
              hitLoopCap = true
              // Still need to append the assistant's tool-call request + execute
              // the tools so we don't lose the work — fall through to the push
              // logic below, then break out of the while.
            }

            // Emit the assistant's tool-call request message, then execute
            // each call through the registry and feed results back.
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
              send({ type: 'tool_start', tool: tc.name })

              let args: unknown = {}
              try {
                args = JSON.parse(tc.arguments || '{}')
              } catch {
                /* leave as {} — registry will return INVALID_INPUT */
              }

              // Phase 3 tool dedupe: identical (name, args) within this turn
              // returns the cached result without re-invoking the handler.
              const cacheKey = `${tc.name}::${tc.arguments || '{}'}`
              let result = turnToolCache.get(cacheKey)
              if (!result) {
                result = await masterToolRegistry.execute(tc.name, args, toolCtx)
                turnToolCache.set(cacheKey, result)
              }

              // Surface navigation intent to the UI: when prefill_divination_form
              // succeeds, emit a cta_card event so the chat widget can render it.
              if (
                tc.name === 'prefill_divination_form' &&
                result.ok &&
                result.data &&
                typeof result.data === 'object'
              ) {
                send({ type: 'cta_card', payload: result.data })
              }

              // Surface reference cards: when show_reading_card succeeds, emit
              // a reading_card event so the chat widget can render a clickable
              // card linking to the existing reading page. The master uses this
              // instead of restating chart contents in prose.
              if (
                tc.name === 'show_reading_card' &&
                result.ok &&
                result.data &&
                typeof result.data === 'object'
              ) {
                send({ type: 'reading_card', payload: result.data })
              }

              allToolCalls.push({ name: tc.name, args: (typeof args === 'object' && args) ? (args as Record<string, unknown>) : {}, result })

              send({ type: 'tool_end', tool: tc.name })

              // Feed the tool result back to the model as a 'tool' role message.
              currentMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              })
            }

            // Loop cap reached after executing this iteration's tools —
            // fall through to the synthesis pass below.
            if (hitLoopCap) break
          }

          // Forced final synthesis: if we ran out of loop budget OR produced
          // zero visible content so far, do one more streamLLM pass WITHOUT
          // tools so the model is obligated to respond in prose. Without this,
          // a long tool-calling chain ends with an empty assistant bubble.
          if (assistantContent.trim().length === 0) {
            for await (const chunk of streamLLM({
              endpoint: 'master',
              userId,
              systemPrompt,
              messages: currentMessages,
              model,
              // No `tools` — forces the model to answer in prose.
            })) {
              if (chunk.type === 'content') {
                assistantContent += chunk.text
                send({ type: 'content', text: chunk.text })
              }
            }
          }

          // Append the assistant turn to MasterChatMessage. The legacy
          // count-based summariseOldMessages is gone — Phase 3 compression
          // (compressHistory) runs upstream of streamLLM on the next turn,
          // operating on rows from MasterChatMessage with token-budget logic.
          await appendMasterChatMessage({
            userId,
            sessionId,
            role: 'assistant',
            content: assistantContent,
            toolCallsJson:
              allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null,
            tokenCount: estimateTokens(assistantContent),
          })

          // Phase 6: legacy MasterSession.messages JSON write dropped.
          // Canonical source has been MasterChatMessage since Phase 3 reads.
          // We still bump totalCreditsUsed on the existing row.
          await prisma.masterSession.update({
            where: { id: masterSession!.id },
            data: {
              totalCreditsUsed: { increment: 1 },
            },
          })

          // Notify the client first; extraction below runs after `done` and
          // the client has stopped reading, so it doesn't add visible latency.
          send({ type: 'done' })

          // ─── Phase 4: maybe extract portrait ─────────────────────────
          // Fires when (currentTurnIndex - lastTurnIndexCovered) >= 30.
          // The trigger is checked inside the function. Best-effort —
          // never throws; failures are logged.
          //
          // Computed currentTurnIndex from message count (we just wrote the
          // assistant turn so count is the next turn's expected index).
          try {
            const allRowsAfter = await loadMasterChatMessages(userId, sessionId)
            const latestTurnIndex = allRowsAfter.length > 0
              ? Math.max(...allRowsAfter.map((r) => r.turnIndex))
              : 0
            await maybeExtractPortrait({
              userId,
              sessionId,
              currentTurnIndex: latestTurnIndex,
              lang,
            })
          } catch (extractErr) {
            console.error('[master] portrait extraction failed:', extractErr)
          }
        } catch (err) {
          console.error('[master] stream error:', err)
          send({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[master] error:', err)
    return jsonError('Internal server error', 500)
  }
}

// ---------------------------------------------------------------------------
// GET — load session history + reading-state hints + disclosure flag.
// Phase 5: messages are now read from MasterChatMessage (canonical source),
// not the legacy MasterSession.messages JSON blob.
// Returns:
//   - messages: chat transcript from the active (non-archived) session
//   - hasReadings / lastReading / readingTypeCounts: greeting state (Phase 0)
//   - disclosureSeen: whether the user has seen the first-use disclosure modal
//   - portraitEnabled: gates the personalized prompt block
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return jsonError('Unauthorized', 401)
    const userId = session.user.id

    // Load reading-state hints + user flags in parallel. Uses raw SQL
    // for new User columns (portraitEnabled, masterMemoryDisclosureSeenAt)
    // because the generated client hasn't been regenerated yet.
    const [userFlags, lastReading, typeCounts] = await Promise.all([
      prisma.$queryRawUnsafe<
        Array<{ masterMemoryDisclosureSeenAt: Date | null; portraitEnabled: boolean }>
      >(
        `SELECT "masterMemoryDisclosureSeenAt", "portraitEnabled" FROM "User" WHERE "id" = $1`,
        userId,
      ).then((rows) => rows[0] ?? null),
      prisma.reading.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { type: true, createdAt: true },
      }),
      prisma.reading.groupBy({
        by: ['type'],
        where: { userId, deletedAt: null },
        _count: { _all: true },
      }),
    ])

    // Load active session messages from MasterChatMessage. If no active
    // session, return empty (widget will render greeting).
    const activeSessionId = await getActiveSessionId(userId)
    let messages: Array<{ role: string; content: string; timestamp: string }> = []
    if (activeSessionId) {
      const rows = await loadMasterChatMessages(userId, activeSessionId)
      messages = rows
        .filter((r) => r.role === 'user' || r.role === 'assistant')
        .map((r) => ({
          role: r.role,
          content: r.content ?? '',
          timestamp: r.createdAt.toISOString(),
        }))
    }

    const readingTypeCounts: Record<string, number> = {}
    for (const row of typeCounts) {
      readingTypeCounts[row.type] = row._count._all
    }

    return jsonResponse({
      messages,
      hasReadings: lastReading != null,
      lastReading: lastReading
        ? { type: lastReading.type, createdAt: lastReading.createdAt.toISOString() }
        : null,
      readingTypeCounts,
      disclosureSeen: userFlags?.masterMemoryDisclosureSeenAt != null,
      portraitEnabled: userFlags?.portraitEnabled ?? true,
    })
  } catch (err) {
    console.error('[master] GET error:', err)
    return jsonError('Internal server error', 500)
  }
}

// ---------------------------------------------------------------------------
// DELETE — "Forget everything about me". Hard-clears all master state:
//   - all MasterChatMessage rows (chat history, both active and archived)
//   - UserPortrait + all UserPortraitHistory rows
//   - MasterSession.messages JSON (legacy blob)
//   - Resets masterMemoryDisclosureSeenAt so the disclosure shows again
// Used by the widget's "Forget everything" button. Phase 6 will route this
// through the GDPR profile-delete cascade as well.
// ---------------------------------------------------------------------------
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return jsonError('Unauthorized', 401)
    const userId = session.user.id

    await Promise.all([
      deleteAllMasterChatMessages(userId),
      deletePortrait(userId),
      prisma.masterSession.deleteMany({ where: { userId } }),
    ])

    // Reset the disclosure flag so the user sees the modal next time
    // (they may want to opt-out after a clean slate).
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "masterMemoryDisclosureSeenAt" = NULL WHERE "id" = $1`,
      userId,
    )

    return jsonResponse({ success: true })
  } catch (err) {
    console.error('[master] DELETE error:', err)
    return jsonError('Internal server error', 500)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  })
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Best-effort extraction of a short portrait summary from a legacy session
 * row. New sessions don't write portrait; this only serves back-compat so
 * long-running users keep their accumulated summary until it naturally
 * fades out of the 50-message rolling window.
 */
function safeExtractPortraitSummary(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { summaryNotes?: string }
    return parsed.summaryNotes?.trim() || null
  } catch {
    return null
  }
}
