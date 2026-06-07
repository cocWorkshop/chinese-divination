/**
 * POST /api/admin/master-debug/[userId]/extract-dry-run
 *
 * Runs the portrait extractor against the target user's chat history and
 * returns the proposed portrait WITHOUT saving. Useful for testing
 * extraction prompt changes against real data.
 *
 * Currently bypasses the EXTRACTION_TURN_THRESHOLD gate so the admin can
 * preview at any point. Does NOT write to UserPortrait or
 * UserPortraitHistory. Logs `force_extract_portrait` with the dry-run
 * output in metadata.
 *
 * Admin-only.
 */

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import {
  loadMasterChatMessages,
  getActiveSessionId,
} from '@/lib/master/chatMessageStore'
import { loadPortrait } from '@/lib/master/portraitStore'
import { parseExtractorOutput } from '@/lib/master/portraitExtractor'
import { completeLLM, resolveLLMConfig } from '@/lib/llm'
import { logAdminAccess } from '@/lib/master/adminAccessLog'

interface RouteParams {
  params: Promise<{ userId: string }>
}

const DRY_RUN_SYSTEM_PROMPT = `你正在更新一个用户的"玄机大师记忆"画像（管理员 dry-run 模式）。

**重要：这是一次增量更新。** 你会收到：
1. 用户当前的画像（可能为空，表示首次提取）
2. 自上次提取以来的新对话片段（不是全部历史）

合并已有信息与新证据，输出更新后的完整画像。

**输出格式（严格 JSON）：**
{
  "topics": [...],
  "preferences": { "tone": "...", "depth": "...", "language": "..." },
  "lifeContext": "...",
  "toneNotes": "..."
}

不要输出非 JSON 内容。`

export async function POST(_req: Request, { params }: RouteParams) {
  const { error, user } = await requireAdmin()
  if (error) return error
  const { userId: targetUserId } = await params
  const adminUserId = user!.id

  const sessionId = await getActiveSessionId(targetUserId)
  if (!sessionId) {
    return NextResponse.json({ error: 'No active session for this user' }, { status: 400 })
  }

  const [existing, allRows] = await Promise.all([
    loadPortrait(targetUserId),
    loadMasterChatMessages(targetUserId, sessionId),
  ])

  const cursor = existing?.lastTurnIndexCovered ?? 0
  const newRows = allRows.filter((r) => r.turnIndex > cursor)

  const portraitJson = existing
    ? JSON.stringify(
        {
          topics: existing.topics,
          preferences: existing.preferences,
          lifeContext: existing.lifeContext,
          toneNotes: existing.toneNotes,
        },
        null,
        2,
      )
    : '{}'

  const userMessage = [
    '[CURRENT_PORTRAIT]',
    portraitJson,
    '[/CURRENT_PORTRAIT]',
    '',
    `[NEW_MESSAGES] (turns ${newRows[0]?.turnIndex ?? 0} to ${newRows[newRows.length - 1]?.turnIndex ?? 0})`,
    ...newRows
      .filter((r) => r.role === 'user' || r.role === 'assistant')
      .map((r) => `<${r.role}>${r.content ?? ''}</${r.role}>`),
    '[/NEW_MESSAGES]',
  ].join('\n')

  // Resolve model (same as the real extractor — masterBackground endpoint)
  const { model } = await resolveLLMConfig({ endpoint: 'masterBackground' })

  let proposed: ReturnType<typeof parseExtractorOutput> | null = null
  let parseError: string | null = null
  let llmError: string | null = null
  let rawOutput = ''
  try {
    const result = await completeLLM({
      // Mirror the real extractor: maxTokens / reasoning resolved from the
      // masterBackground admin config (only the model is pre-resolved).
      endpoint: 'masterBackground',
      userId: targetUserId,
      systemPrompt: DRY_RUN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      model,
    })
    rawOutput = result.content || ''
    proposed = parseExtractorOutput(rawOutput)
    if (!proposed) parseError = 'Could not parse extractor output as JSON'
  } catch (e) {
    llmError = (e as Error).message || 'Unknown LLM error'
  }

  await logAdminAccess({
    adminUserId,
    targetUserId,
    action: 'force_extract_portrait',
    reason: 'dry-run preview',
    metadata: {
      modelUsed: model,
      newRowsCount: newRows.length,
      parseError,
      llmError,
      proposed,
    },
  })

  return NextResponse.json({
    modelUsed: model,
    cursor,
    newRowsCount: newRows.length,
    rawOutput,
    proposed,
    parseError,
    llmError,
  })
}
