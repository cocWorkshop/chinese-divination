# Master Xuanji — Activation Dialogue Resume Mechanism Design

**Status:** Design / Implemented  
**Date:** 2026-04-27  
**Owner:** Wei Zhang  
**Scope:** `MasterChatContext.tsx` (client), `/api/master/route.ts` + `/api/master/cta-status` endpoint, `divination-refs/master.md`  

---

## 1. Problem Definition

When a user **activates the chat window** (collapsed → expanded, or expanded after page refresh), the current behavior:

- **Existing**: If distance since last assistant reply > 2h and not within cooldown → fire `triggerCheckin()`; server-side `buildCheckinAppendix` provides gap / solar terms / recent reading anchors for master selection.
- **Unhandled cases**:
  1. **CTA pending completion**: Master previously emitted a CTA card and the conversation paused; the user may have completed divination in another tab/browser or while the widget was collapsed, but the widget has no awareness.
  2. **User offline interruption**: Last message was from user and assistant never replied (network dropped, user navigated away, external factors) — currently `last.role !== 'assistant'` bails early and never resumes.
  3. **Conversation naturally closed**: Master concluded with "Take care", user replied "Thank you" — Master should not proactively speak again.

Required behaviors:
- **Mode 1** (CTA pending) → Query whether reading exists → if completed, advance analysis; if incomplete, inquire whether to proceed.
- **Mode 2** (General interruption) → Proactively engage as Master Xuanji.
- **Mode 3** (Closed) → Remain silent.

---

## 2. Design Overview

**Two-Stage Classifier**: Deterministic fast-path handles Mode 1 (CTA pending); the remaining states are delegated to Master LLM for Mode 2/3 triage.

```
Widget expanded
  ↓
Preconditions: authenticated / historyLoaded / messages.length > 0 /
               not streaming / cooldown elapsed
  ↓
─────── Stage 1: Deterministic fast-path ───────
  Scan messages for latest assistant cta_card
  ├─ CTA found → query /api/master/cta-status
  │     ├─ completed=true  → swap card → reading_card,
  │     │                    inject "[reading complete]" → runTurn
  │     │                    (mirrors existing readingComplete handler)
  │     └─ completed=false →
  │           CTA < 30 min ago → do not disturb (user may still be on divination page)
  │           CTA > 30 min ago → runTurn({ activation: 'cta_pending_aged' })
  │                              master asks whether to proceed
  └─ No CTA found → proceed to Stage 2
─────── Stage 2: Structural triage + LLM self-triage ───────
  Last message classification:
    ├─ role=user, no assistant reply → runTurn({ activation: 'unanswered_user' })
    │                                  hint: "You owe user a reply; pick up directly"
    ├─ role=assistant, matches closing regex → silent
    │   Match criteria (any):
    │     - Contains farewell phrases (take care, bye, best wishes, etc.)
    │     - Previous user message was closing phrase and current assistant is closing
    └─ role=assistant, other → runTurn({ activation: 'ambiguous_resume' })
                               delegated to master self-triage (reflection rules:
                               if nothing noteworthy, output a short closing line)
```

**Key Design Choices**:

1. **Silence does not rely on "empty response"**: Master follows reflection conventions: if nothing noteworthy to add, emit **a single short closer** ("Ah, you have returned.", "I will be here."). This avoids dual-sided empty suppression logic while maintaining seamless UX.
2. **Extends rather than replaces `triggerCheckin`**: Replaces the evaluation logic in the expand-effect with two-stage triage, expanding `runTurn` payload from `{ checkin: true }` to `{ checkin: 'gap' | 'cta_pending_aged' | 'unanswered_user' | 'ambiguous_resume' }`. The server applies different system prompt appendices accordingly.
3. **Reuses existing cooldown**: `proactiveLastFiredRef` + `PROACTIVE_COOLDOWN_MS = 5min` prevents collapse/expand thrashing.
4. **Time window thresholds**:
   - `< 5 min`: Do not trigger any stage (same-session expand/collapse nuisance).
   - `5 min – 14 days`: Execute two-stage triage.
   - `> 14 days`: Fallback to "long absence" welcome, running Stage 2 with `long_gap_resume` hint.
   - Note: Existing `PROACTIVE_GAP_MS = 2h` tightened to `5 min` when CTA exists, maintaining `2h` when no CTA exists.
5. **Stateless / No DB writes**: All decisions rely on existing GET `/api/master` response plus one lightweight `cta-status` query.

---

## 3. Detailed Design

### 3.1 Stage 1 — CTA Fast-Path

**Objective**: Detect cases where user completed (or did not complete) divination outside the widget after a CTA was issued, and act accordingly.

#### 3.1.1 Finding Latest CTA

Walk `messages` from end → start, locating first `kind === 'cta_card'` assistant message. Extract:
- `ctaTimestamp` — message timestamp
- `ctaType` — `ctaPayload.divinationType`
- `ctaTarget` — inferred from `ctaPayload.ctaContext.target`: containing "self" / "yourself" → `self`; otherwise `family`.

If a `reading_card` is encountered prior to the CTA card during the reverse walk, and matches the CTA divination type → treat as **already handled**, skip Stage 1, proceed to Stage 2.

#### 3.1.2 Endpoint: `GET /api/master/cta-status`

**Why a new endpoint**: Existing GET `/api/master` returns `lastReading` across the entire account, which cannot determine whether a reading matching `type` was created *after* `ctaTimestamp`.

**Request**:
```
GET /api/master/cta-status?type=bazi&since=2026-04-27T08:30:00Z&target=self
```

**Response**:
```typescript
// self CTA
{ completed: true, readingId: 'abc123', completedAt: '2026-04-27T09:15:00Z' }
{ completed: false }

// family CTA — phase 1 uses fuzzy match: any family reading created after since
{ completed: true, readingId: 'xyz789' }
{ completed: false }
```

**Server Logic**:
```typescript
prisma.reading.findFirst({
  where: {
    userId,
    type,
    targetType: target ?? 'self',
    deletedAt: null,
    createdAt: { gte: new Date(since) },
  },
  orderBy: { createdAt: 'asc' }, // Earliest matching reading after CTA
  select: { id: true, createdAt: true },
})
```

#### 3.1.3 Three Branches

```typescript
const ageMs = Date.now() - new Date(ctaTimestamp).getTime()

if (ctaStatus.completed) {
  // Mirror readingComplete handler: swap card + inject synthetic instruction
  setMessages(prev => prev.map(m =>
    m === ctaCardMsg
      ? { ...m, kind: 'reading_card', ctaPayload: undefined,
          readingCardPayload: { ... } }
      : m
  ))
  void runTurn({
    messages: [`[Divination Completed] ${type} chart completed (id: ${readingId}). Please continue analysis.`]
  })
} else if (ageMs < 30 * 60 * 1000) {
  // Within 30 minutes, user likely still on divination page — do not disturb
  return
} else {
  // > 30 minutes incomplete — proactively inquire
  void runTurn({ checkin: 'cta_pending_aged' })
}
```

---

### 3.2 Stage 2 — Structural Triage + LLM Self-Triage

**Objective**: When no pending CTA exists, determine silent / resume based on the final message, passing the appropriate hint to the server.

#### 3.2.1 Closing Detection (Client Heuristic)

```typescript
// Chinese closing patterns: matches phrases like 'take care', 'farewell', 'good luck', etc.
const CLOSING_PATTERNS_ZH = /(?:\u4fdd\u91cd|\u518d[\u898b\u89c1]|\u795d[\u60a8\u4f60].*(?:\u9806\u5229|\u5e73\u5b89|\u5065\u5eb7|\u597d\u904b|\u597d\u8fd0)|\u591a\u4fdd\u91cd|\u6162\u8d70|\u6709\u4e8b\u518d[\u4f86\u6765]|\u6539\u5929[\u518d\u518d][\u804a\u804a])/
const CLOSING_PATTERNS_EN = /\btake care\b|\bgood luck\b|\btalk (?:to you )?later\b|\bcatch you\b|\bsee you\b|\bbye\b|\bfare ?well\b/i

function isClosed(messages: MasterMsg[], lang: 'zh-TW' | 'en'): boolean {
  const lastAssistant = [...messages].reverse().find(m =>
    m.role === 'assistant' && (m.kind === 'text' || !m.kind) && m.content.trim()
  )
  if (!lastAssistant) return false
  const pattern = lang === 'en' ? CLOSING_PATTERNS_EN : CLOSING_PATTERNS_ZH
  if (!pattern.test(lastAssistant.content)) return false

  // User preceding message must also be closing or acknowledgment
  const lastUser = [...messages].reverse().find(m =>
    m.role === 'user' && m.kind === 'text'
  )
  if (!lastUser) return true
  // Chinese user closing patterns: matches 'thank you', 'understood', 'that is all', 'bye', etc.
  const userClosingZh = /^(?:\u597d[\uff0c\u3002 ]?(?:\u8b1d\u8b1d|\u8c22\u8c22|\u4e86)|\u8b1d\u8b1d|\u8c22\u8c22|\u4e86\u89e3|\u660e\u767d|\u6536\u5230|\u6c92\u4e86|\u6ca1\u4e86|\u5c31\u9019\u6a23|\u5c31\u8fd9\u6837|\u62dc\u62dc|\u518d\u898b|\u518d\u89c1)/
  const userClosingEn = /^(thanks?|thank you|got it|sounds good|that(’|')s all|bye|see ?ya|cheers)\.?\s*$/i
  return lang === 'en' ? userClosingEn.test(lastUser.content.trim())
                       : userClosingZh.test(lastUser.content.trim())
}
```

Closing detection rules are intentionally **conservative**: both assistant and user closing phrases must match to conclude closure. False negatives (an extra LLM call) are preferred over false positives (unwanted silence when dialogue was expected).

#### 3.2.2 Three Branches

```typescript
const last = messages[messages.length - 1]

if (last.role === 'user') {
  // Assistant never replied — pick up regardless of elapsed time
  void runTurn({ checkin: 'unanswered_user' })
} else if (isClosed(messages, lang)) {
  // Closed dialogue, remain silent
  return
} else {
  // Ambiguous — delegate to master LLM
  void runTurn({ checkin: 'ambiguous_resume' })
}
```

---

### 3.3 Server-Side: Extended Checkin Appendix

Replace `body.checkin === true` with `body.checkin: string | true` (backwards-compatible):

```typescript
type CheckinHint = 'gap' | 'cta_pending_aged' | 'unanswered_user' | 'ambiguous_resume' | 'long_gap_resume'

function buildCheckinAppendix(
  userId: string, sessionId: string, lang: 'zh-TW' | 'en',
  hint: CheckinHint = 'gap',
): Promise<string>
```

#### `cta_pending_aged`

```
## Proactive Inquiry — CTA Pending Completion

The user was previously shown a [type] divination CTA card in conversation, but [age] has elapsed without completion.
Now opening the conversation indicates willingness to continue, but possible hesitation.

Guidelines:
1. Confirm in a single sentence whether they still wish to cast that chart (do not assume).
2. If they hesitate, offer an alternative: "Feel free to state your question directly; I can offer guidance from existing data."
3. Do not re-explain what the divination system does — that was covered in the initial CTA.

Prohibition: Never re-emit the same CTA card proactively. Let the user choose to continue, pivot, or converse.
```

#### `unanswered_user`

```
## Proactive Catch-Up — Unanswered User Query

The last message was sent by the user, and you never replied. Cause: connection dropped, user navigated away, or session interrupted.

Guidelines:
1. Treat the message as freshly received and respond normally. No explanation or apology for delay needed.
2. Do not open with customer-service apologies like "Sorry for keeping you waiting" — users require substantive metaphysical insight.
3. Deliver the response directly; if needed, open with a short framing reference to ground the topic.

Prohibition: Avoid filler like "Let me now answer your earlier question". Answer directly.
```

#### `ambiguous_resume`

```
## Proactive Resume — Identify a Worthwhile Follow-Up

The user just reopened the chat. Review the last 3-5 turns:

1. Was a thread opened without conclusion? If so, follow up with 1-2 concise bubbles asking for outcomes or adding a remark.
2. Did the user ask X while you answered tangential topics? If so, address X directly.
3. If neither applies, a brief welcoming acknowledgement suffices ("Ah, you have returned. Whenever you are ready.") — do not force a topic.

Rule mirrors reflection: if nothing genuine to say, a quiet short sentence is preferred over filler.
```

#### `long_gap_resume` (> 14 days)

```
## Proactive Opening — Long Absence

[days] days have elapsed since the last dialogue. Energy and circumstances have shifted.

Guidelines:
1. Do not resume old topics — they are too distant.
2. Anchor in current context: solar term [jieQi], annual pillar [yearGanZhi], or their most recent chart.
3. Keep to a short greeting plus one focused question.

Prohibition: Avoid customer-service greetings like "Welcome back!". Do not enumerate past conversations.
```

`gap` remains the default fallback for backward compatibility.

---

### 3.4 Client Wiring Changes

Replace existing expand-effect in `MasterChatContext.tsx` with dispatcher:

```typescript
const checkinDispatcher = useCallback(async () => {
  if (sendingRef.current) return
  if (Date.now() - proactiveLastFiredRef.current < PROACTIVE_COOLDOWN_MS) return
  if (messages.length === 0) return

  const last = messages[messages.length - 1]
  if (!last) return
  const lastTs = new Date(last.timestamp).getTime()
  if (!Number.isFinite(lastTs)) return
  const ageMs = Date.now() - lastTs

  // < 5 min: Never fire
  if (ageMs < 5 * 60 * 1000) return

  proactiveLastFiredRef.current = Date.now()

  // Stage 1: CTA fast-path
  const cta = findLatestPendingCTA(messages)
  if (cta) {
    const ctaAgeMs = Date.now() - new Date(cta.timestamp).getTime()
    const status = await fetchCtaStatus(cta)
    if (status.completed) {
      swapCtaToReadingCard(cta, status)
      void runTurn({ messages: [buildCompletionSyntheticMsg(cta, status, lang)] })
      return
    }
    if (ctaAgeMs >= 30 * 60 * 1000) {
      void runTurn({ checkin: 'cta_pending_aged' })
    }
    return // < 30 min incomplete -> do not disturb
  }

  // Stage 2: Structural triage
  if (last.role === 'user') {
    void runTurn({ checkin: 'unanswered_user' })
    return
  }
  if (last.role === 'assistant' && isClosed(messages, lang)) {
    return // Silent
  }
  if (ageMs > 14 * 24 * 60 * 60 * 1000) {
    void runTurn({ checkin: 'long_gap_resume' })
    return
  }
  void runTurn({ checkin: 'ambiguous_resume' })
}, [messages, runTurn, lang])

useEffect(() => {
  if (shape !== 'expanded' || !enabled || !historyLoaded) return
  void checkinDispatcher()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [shape, enabled, historyLoaded])
```

---

### 3.5 Section Added to `master.md`

Appended after the "Reflection" section:

```markdown
## Activation — when [activation_*] hints arrive

When the runtime injects a `[activation_*]` synthetic instruction (cta_pending_aged / unanswered_user / ambiguous_resume / long_gap_resume), follow the hint's specific rule. Cross-cutting principles:

- You DO NOT need to explain why the conversation paused. The user knows.
- Match the energy of a chat picking up — short, specific, no preamble.
- "If nothing genuine to say → one short closer line and stop" applies here too. Empty filler is worse than a silent stop.
- NEVER re-emit the same CTA the user just walked away from. They saw it. Re-asking would feel like a sales loop.
- The user's last message and your last message are still in your context — read them before you write.
```

---

## 4. Out of Scope

- Truly empty assistant response (Master emits a short closer if no topic).
- Fine-grained `readingId` matching for family CTAs (Phase 1 fuzzy matches first reading of same type/target created after CTA timestamp).
- Web push notifications outside the widget.
- Extra server LLM calls for classification (fast-path is pure SQL; ambiguous states handled inside main turn).

---

## 5. Risks and Monitoring

| Risk | Mitigation / Monitoring |
|---|---|
| `isClosed` false negative (speaks when should be silent) | Track ratio of `ambiguous_resume` triggers in concluded sessions |
| `cta_pending_aged` fires too often (feels pushy) | 30 min is initial threshold; kept configurable in `MasterChatContext` |
| `unanswered_user` answers outdated queries out of context | System prompt explicitly guides grounded framing without apologetic filler |
| Multi-device sync latency (PC completes while phone widget closed) | Handled by `xuanji:readingsChanged` and `cache: 'no-store'`; checks run post-`historyLoaded` |
| 5-minute cooldown across multi-tab switching | Monitor trigger frequencies; adjust to 10 min if needed |

---

## 6. Implementation Sequence

1. Add "Activation" section to `master.md`.
2. Implement `/api/master/cta-status/route.ts` endpoint.
3. Refactor `route.ts`: update `buildCheckinAppendix(hint)` and parse request body.
4. Refactor `MasterChatContext.tsx`: replace expand-effect with `checkinDispatcher`, add `findLatestPendingCTA` / `isClosed` / `fetchCtaStatus` helpers.
5. Unit tests: pure function tests for `isClosed` in Vitest.
6. Typecheck and verify `buildSystemPrompt` test suite.

---

**Kickoff Prompt Reference**: "To inspect the Master activation resume design/implementation: see `docs/archive/activation-resume-design-2026-04-27.md`, client dispatcher in `MasterChatContext.tsx`, server logic in `/api/master/route.ts` (`buildCheckinAppendix(hint)`)."
