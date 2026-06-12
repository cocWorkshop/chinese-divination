/**
 * finalizeDivination — the single post-LLM pipeline (architecture plan I8).
 *
 * parse → hard-reject gates → merge → permissive validate → save + settle
 * credits → profile updates. Previously duplicated (~140 lines) between the
 * blocking and streaming paths of route.ts; both now call this, so billing
 * and save behavior cannot drift between transports again.
 *
 * Credit settlement (I5):
 *   - holdAmount > 0  → the reading was paid at /init (Reading.creditsHeld);
 *     success keeps the hold, failure paths refund it via markFailed.
 *   - holdAmount === 0 → legacy flow (no /init hold; e.g. saveHistory=false):
 *     deduct here on success, exactly like the historical behavior.
 *
 * The route maps the outcome to its transport (JSON response / SSE events).
 */

import { prisma } from '@/lib/prisma'
import { deductCredits } from '@/lib/rateLimit'
import { markCompleted, markFailed } from '@/lib/readings/lifecycle'
import type { RequestLogger } from '@/lib/logger'
import { validateHandlerOutput, type DivinationContext, type DivinationHandler } from './handlers'
import { hasRenderableContent } from './schemas/_validate'
import { parseJsonFromLLMOutput, PARSE_FAILED_KEY } from './handlers/_jsonParse'

export interface FinalizeArgs {
  rawText: string
  type: string
  language: string
  modelName: string
  handler: DivinationHandler
  chart: unknown
  ctx: DivinationContext
  userId: string
  pendingReadingId: string | null
  shouldSaveHistory: boolean
  shouldSaveProfile: boolean
  resolvedFamilyMemberId: string | null
  targetType: string
  inputData: Record<string, unknown>
  systemPrompt: string
  userMessage: string
  llmStart: number
  /** Credits already held at /init for this reading (0 = legacy deduct-here flow). */
  holdAmount: number
  log: RequestLogger
  phase?: 'stream'
}

export type FinalizeOutcome =
  | { ok: true; reading: Record<string, unknown>; saved: boolean; resultToStore: string; postLlmMs: number }
  | { ok: false; errMsg: string; status: number }

function formatErrMsg(language: string): string {
  return language !== 'en'
    ? '🔧 玄機解讀格式異常，您的機緣未扣除。請重新嘗試，若持續異常請聯繫管理員。'
    : '🔧 The oracle produced an unexpected format — your Karma was not deducted. Please try again, or contact admin if the issue persists.'
}

export async function finalizeDivination(args: FinalizeArgs): Promise<FinalizeOutcome> {
  const {
    rawText, type, language, modelName, handler, chart, ctx, userId,
    pendingReadingId, shouldSaveHistory, shouldSaveProfile,
    resolvedFamilyMemberId, targetType, inputData, systemPrompt, userMessage,
    llmStart, holdAmount, log, phase,
  } = args

  const structuredResult = parseJsonFromLLMOutput(rawText, type)

  // Hard reject #1: JSON parse + repair both failed entirely. Refuse the turn —
  // no save, hold refunded (markFailed), nothing fabricated for the renderer.
  if (structuredResult[PARSE_FAILED_KEY] === true) {
    log.error({ type, model: modelName, latencyMs: Date.now() - llmStart, rawLen: rawText.length, phase }, 'llm output unparseable')
    if (pendingReadingId) {
      await markFailed(pendingReadingId, { reason: 'LLM JSON parse failed', llmRawOutput: rawText })
    }
    return { ok: false, errMsg: formatErrMsg(language), status: 502 }
  }

  if (chart && handler.merge) {
    handler.merge(structuredResult, chart, ctx)
  }
  const validation = validateHandlerOutput(handler, structuredResult)
  if (!validation.success) {
    log.error({ type, model: modelName, latencyMs: Date.now() - llmStart, issues: validation.issues, phase }, 'zod validation issues')
    // Hard-reject #2: nothing renderable (empty/metadata-only output).
    if (!hasRenderableContent(structuredResult)) {
      if (pendingReadingId) {
        await markFailed(pendingReadingId, { reason: 'Invalid LLM output format', llmRawOutput: rawText })
      }
      return { ok: false, errMsg: formatErrMsg(language), status: 502 }
    }
  }

  const resultToStore = JSON.stringify(structuredResult)
  const llmPromptStr = `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userMessage}`

  // Save + settle credits immediately so they complete even if the client
  // disconnects. With a hold, the reading is already paid — deduct only on
  // the legacy no-hold flow.
  const postStart = Date.now()
  const postOps: Promise<unknown>[] = []
  if (holdAmount === 0) {
    postOps.push(deductCredits(userId, type))
  }
  let savedReading: Record<string, unknown> | null = null
  if (shouldSaveHistory && pendingReadingId) {
    postOps.push(
      markCompleted(pendingReadingId, {
        result: resultToStore,
        llmPrompt: llmPromptStr,
        llmRawOutput: rawText,
      }).then((r) => { savedReading = r })
    )
  }
  if (shouldSaveProfile && (type === 'bazi' || type === 'ziwei')) {
    const profileUpdate: Record<string, string | number | null> = {}
    const data = inputData
    if (typeof data.birthDate === 'string') profileUpdate.birthDate = data.birthDate
    if (typeof data.birthTime === 'string') profileUpdate.birthTime = data.birthTime
    if (typeof data.birthPlace === 'string') profileUpdate.birthPlace = data.birthPlace
    if (typeof data.gender === 'string') profileUpdate.gender = data.gender
    if (typeof data.timeMode === 'string') profileUpdate.timeMode = data.timeMode
    if (typeof data.exactTime === 'string') profileUpdate.exactTime = data.exactTime
    if (typeof data.lunarToggle === 'string') profileUpdate.calendarType = data.lunarToggle
    if (typeof data.birthEnvironment === 'string') profileUpdate.birthEnvironment = data.birthEnvironment
    if (data.birthLat != null) profileUpdate.birthLat = data.birthLat as number
    if (data.birthLng != null) profileUpdate.birthLng = data.birthLng as number
    if (Object.keys(profileUpdate).length > 0) {
      if (targetType === 'family' && resolvedFamilyMemberId) {
        postOps.push(prisma.familyMember.update({ where: { id: resolvedFamilyMemberId }, data: profileUpdate }))
      } else {
        postOps.push(prisma.user.update({ where: { id: userId }, data: profileUpdate }))
      }
    }
  }

  await Promise.all(postOps)
  const postLlmMs = Date.now() - postStart

  const reading = savedReading
    ? Object.assign({}, savedReading, { result: resultToStore })
    : { id: null as string | null, result: resultToStore, type, createdAt: new Date() }
  return { ok: true, reading, saved: !!savedReading, resultToStore, postLlmMs }
}
