# 玄機大師 — 激活時對話續接機制設計

**Status:** Design / 待實作
**Date:** 2026-04-27
**Owner:** Wei Zhang
**Scope:** `MasterChatContext.tsx` (client), `/api/master/route.ts` + 新 `/api/master/cta-status` endpoint, `divination-refs/master.md`

---

## 1. 問題定義

當用戶**激活對話視窗**（collapsed → expanded，或刷新頁面後展開）時，目前的行為：

- **已有**：若距離上次 assistant 回覆 >2h 且未在 cooldown 內 → fire `triggerCheckin()`，server 端 `buildCheckinAppendix` 提供 gap / 節氣 / 最近 reading 三條錨點供 master 自選
- **不處理**：
  1. **CTA 待完成**：master 上次發了 CTA card 後對話中斷；用戶可能已在另個瀏覽器／另個分頁／widget 收起期間完成了排盤，但 widget 不知道
  2. **用戶離線中斷**：上一條訊息是 user 而 assistant 從未回覆（連線斷掉、用戶切走分頁、其他外因）— 此時 `last.role !== 'assistant'` 會被現有邏輯直接 bail，不會主動接話
  3. **對話已自然收尾**：master 上一句是「保重」「祝您...」，用戶回了「謝謝」 — 此時不該主動再開口

用戶要的三種行為：
- **Mode 1**（CTA 待完成）→ 主動查 reading 是否已存在 → 已完成則繼續推進，未完成則徵求用戶意見
- **Mode 2**（一般中斷）→ 以骨灰級玄學大師身份主動搭話
- **Mode 3**（已收尾）→ 沉默

---

## 2. 設計總覽

**兩階段分類器**：先用 deterministic fast-path 處理 Mode 1（CTA 待完成）；剩下的交給 master LLM 自己判斷 Mode 2/3。

```
widget 展開
  ↓
preconditions：authenticated / historyLoaded / messages.length>0 /
              not streaming / cooldown 已過
  ↓
─────── Stage 1：Deterministic fast-path ───────
  scan messages for 最新的 assistant cta_card
  ├─ 找到 CTA → query /api/master/cta-status
  │     ├─ completed=true  → swap card → reading_card,
  │     │                    inject "[reading complete]" → runTurn
  │     │                    （和現有的 readingComplete handler 同形）
  │     └─ completed=false →
  │           CTA <30 min 前 → 不打擾（用戶可能還在排盤頁）
  │           CTA >30 min 前 → runTurn({ activation: 'cta_pending_aged' })
  │                            master 詢問是否繼續
  └─ 沒找到 CTA → 進入 Stage 2
─────── Stage 2：Structural triage + LLM 自判 ───────
  最後一條訊息分類：
    ├─ role=user，無 assistant 回覆 → runTurn({ activation: 'unanswered_user' })
    │                                  hint: "你欠用戶一個回覆，主動接住"
    ├─ role=assistant，匹配收尾正則 → 沉默
    │   匹配條件（任一）：
    │     - 含「保重 / 再見 / 祝您 / 多保重 / 慢走」(zh)
    │     - 含「take care / good luck / talk later / catch you」(en)
    │     - 上一條 user 是收尾性短語且本條 assistant 也是收尾
    └─ role=assistant，其他 → runTurn({ activation: 'ambiguous_resume' })
                              交由 master 自判（同 reflection 規則：
                              找不到值得說的就一句短結尾）
```

**關鍵設計選擇**：

1. **沉默不靠「empty response」**。Master 沿用 reflection 的設計慣例：找不到值得說的，就**一句短結尾**（「嗯，您回來了。」「I'll be here.」）。這比實作 client/server 雙端的「empty 抑制」乾淨太多，使用者體驗也沒差。

2. **不取代現有 `triggerCheckin`，是擴充它**。現有的 useEffect 已在 widget 展開時運作；我們把判斷邏輯換成上面的兩階段，並把 `runTurn` payload 從 `{ checkin: true }` 擴成 `{ checkin: 'gap' | 'cta_pending_aged' | 'unanswered_user' | 'ambiguous_resume' }`，server 端依 hint 套用不同的 system prompt appendix。

3. **複用現有 cooldown 機制**：`proactiveLastFiredRef` + `PROACTIVE_COOLDOWN_MS = 5min`，避免摺疊／展開反覆觸發。

4. **時間窗門檻**：
   - <5 min：不觸發任何 stage（同 session 摺疊／展開騷擾）
   - 5 min – 14 days：正常走兩階段
   - >14 days：fallback 到「久違」歡迎，仍走 Stage 2 但 hint 變 `long_gap_resume`（master.md 規則中提示用「久違」開場）
   - 改動要點：把現有的 `PROACTIVE_GAP_MS = 2h` 收緊為 `5 min`（有 CTA 時）、保持 `2h`（無 CTA 時）— 因為 CTA 等待是高 intent，5 分鐘就值得追問

5. **不寫資料庫**：所有狀態判斷都基於現有 GET `/api/master` response + 新加一個輕量 cta-status 查詢。

---

## 3. 詳細設計

### 3.1 Stage 1 — CTA fast-path

**目標**：偵測「CTA 卡發出後，用戶在 widget 外完成（或未完成）排盤」並做適當動作。

#### 3.1.1 找最新 CTA

Walk `messages` from end → start，找第一個 `kind === 'cta_card'` 的 assistant 訊息。記錄：
- `ctaTimestamp` — 用 message.timestamp
- `ctaType` — `ctaPayload.divinationType`
- `ctaTarget` — 從 `ctaPayload.ctaContext.target` 推：包含「自己」/「yourself」 → `self`；否則 `family`（不嘗試 reverse-lookup family member id，太脆弱）

若 walk 過程中先遇到一個 reading_card（假設來自 `xuanji:readingComplete` 的 swap 或 master 主動 `show_reading_card`），且該 reading_card 的 type 跟之後找到的 cta_card type 一致 → 視為**已被處理過**，skip Stage 1，進 Stage 2。

#### 3.1.2 新 endpoint：`GET /api/master/cta-status`

**Why a new endpoint**：現有 GET `/api/master` 回的 `lastReading` 是「全用戶最近一張」，不能判斷「在 ctaTimestamp 之後是否有對應 type 的 reading」（用戶可能在 CTA 發出前已有別張 reading）。

**Request**：
```
GET /api/master/cta-status?type=bazi&since=2026-04-27T08:30:00Z&target=self
                                                                  ?target=family（先不傳 familyMemberId — phase 1 不細化）
```

**Response**：
```typescript
// self CTA
{ completed: true, readingId: 'abc123', completedAt: '2026-04-27T09:15:00Z' }
{ completed: false }

// family CTA — phase 1 用 fuzzy match：在 since 後存在的任何 family-target reading
{ completed: true, readingId: 'xyz789' }
{ completed: false }
```

**Server logic**：
```typescript
prisma.reading.findFirst({
  where: {
    userId,
    type,
    targetType: target ?? 'self',
    deletedAt: null,
    createdAt: { gte: new Date(since) },
  },
  orderBy: { createdAt: 'asc' },  // 取最早一張 — 最可能是 CTA 引導出來的那張
  select: { id: true, createdAt: true },
})
```

#### 3.1.3 三條分支

```typescript
const ageMs = Date.now() - new Date(ctaTimestamp).getTime()

if (ctaStatus.completed) {
  // 同現有 readingComplete handler 邏輯：swap card + 注入 synthetic
  setMessages(prev => prev.map(m =>
    m === ctaCardMsg
      ? { ...m, kind: 'reading_card', ctaPayload: undefined,
          readingCardPayload: { ... } }
      : m
  ))
  void runTurn({
    messages: [`[占卜完成] ${type} 命盤已完成 (id: ${readingId})。請繼續分析。`]
  })
} else if (ageMs < 30 * 60 * 1000) {
  // 30 分鐘內，用戶大概還在排盤頁 — 不打擾
  return
} else {
  // 30 分鐘以上未完成 — 主動詢問
  void runTurn({ checkin: 'cta_pending_aged' })
}
```

### 3.2 Stage 2 — 結構分類 + LLM 自判

**目標**：沒有待辦 CTA 時，根據最後一條訊息決定 silent / resume，且把 hint 傳給 server，讓 master 用對應的 prompt appendix。

#### 3.2.1 收尾偵測（純客端，cheap heuristic）

```typescript
const CLOSING_PATTERNS_ZH = /保重|再[見见]|祝[您你].*(順利|平安|健康|好運|好运)|多保重|慢走|有事再[來来]|改天[再再][聊聊]/
const CLOSING_PATTERNS_EN = /\btake care\b|\bgood luck\b|\btalk (?:to you )?later\b|\bcatch you\b|\bsee you\b|\bbye\b|\bfare ?well\b/i

function isClosed(messages: MasterMsg[], lang: 'zh-TW' | 'en'): boolean {
  // 找最後一條 assistant 文字訊息
  const lastAssistant = [...messages].reverse().find(m =>
    m.role === 'assistant' && (m.kind === 'text' || !m.kind) && m.content.trim()
  )
  if (!lastAssistant) return false
  const pattern = lang === 'en' ? CLOSING_PATTERNS_EN : CLOSING_PATTERNS_ZH
  if (!pattern.test(lastAssistant.content)) return false

  // 加強：上一條 user 也應為收尾性 / 致謝 — 否則 master 的「保重」可能只是某段話的尾巴
  const lastUser = [...messages].reverse().find(m =>
    m.role === 'user' && m.kind === 'text'
  )
  if (!lastUser) return true
  const userClosingZh = /^(好[，。 ]?(謝謝|谢谢|了)|謝謝|谢谢|了解|明白|收到|沒了|没了|就這樣|就这样|拜拜|再見|再见)/
  const userClosingEn = /^(thanks?|thank you|got it|sounds good|that(’|')s all|bye|see ?ya|cheers)\.?\s*$/i
  return lang === 'en' ? userClosingEn.test(lastUser.content.trim())
                       : userClosingZh.test(lastUser.content.trim())
}
```

收尾偵測規則寫得**保守**：必須 master 收尾語 + user 收尾／致謝兩者皆中才判定 closed。寧可 false negative（多開 LLM call）也不要 false positive（該主動時保持沉默）。

#### 3.2.2 三條分支

```typescript
const last = messages[messages.length - 1]

if (last.role === 'user') {
  // assistant 從未回覆 — 不管時間多久，都應該接住
  void runTurn({ checkin: 'unanswered_user' })
} else if (isClosed(messages, lang)) {
  // 已收尾，沉默
  return
} else {
  // 一般 ambiguous — 交給 master 自判
  void runTurn({ checkin: 'ambiguous_resume' })
}
```

### 3.3 Server-side：擴充 checkin appendix

把 `body.checkin === true` 換成 `body.checkin: string | true`（向後相容），server 端依 hint 切換 appendix：

```typescript
type CheckinHint = 'gap' | 'cta_pending_aged' | 'unanswered_user' | 'ambiguous_resume' | 'long_gap_resume'

function buildCheckinAppendix(
  userId: string, sessionId: string, lang: 'zh-TW' | 'en',
  hint: CheckinHint = 'gap',
): Promise<string>
```

**新分支**：

#### `cta_pending_aged`

```
## 主動詢問 — CTA 待完成

用戶曾在對話中收到一張 [type] 的占卜引導卡片，但已過 [age] 仍未完成。
這次他重新打開對話 — 表示願意繼續，但可能在猶豫。

**該做的**：
1. 用一句話確認他**是否還想做那盤**（不要假設答案）。
2. 如果他猶豫，提供另一條路：「先講您的問題，我看能不能直接從現有資料給出方向。」
3. 不要重複介紹這個占卜系統能做什麼 — 那已經在原 CTA 對話裡說過。

**禁止**：再次主動 emit 同一張 CTA 卡。讓用戶自己選擇是繼續、改方向、或先聊。
```

#### `unanswered_user`

```
## 主動接住 — 你欠用戶一個回覆

最後一條訊息是用戶發出的，**你從未回覆**。可能因為：連線中斷／用戶切走頁面／這個會話被打斷後從未恢復。

**該做的**：
1. 把那條訊息當作剛剛收到，正常回應。不需要解釋為什麼晚回。
2. 不要以「不好意思讓您等」之類的話開場 — 用戶不需要 customer service 致歉，需要實質內容。
3. 直接給出回應；如有需要可在開頭加一句「您剛才問的 X — 」幫助對位。

**禁止**：說「您之前問的問題我來回答」這種冗詞。直接答。
```

#### `ambiguous_resume`

```
## 主動續話 — 找一個值得補的點

用戶剛重新打開對話。看一下最近 3-5 輪：

1. 有沒有開了話頭沒收尾的線？有 → 接它，1-2 個短氣泡，問結果或補一句。
2. 有沒有用戶問了 X 但你答了 X 旁邊的東西？有 → 補正面那一句。
3. 都沒有 → 一句短結尾就好（「嗯，您回來了。有事再說。」）— **不要硬擠話題**。

規則同 reflection：找不到值得說的，沉默式短句即可。empty 比 filler 強。
```

#### `long_gap_resume`（>14 天）

```
## 主動開場 — 久違

距離上次對話已 [days] 天。氣息不一樣了。

**該做的**：
1. 不要從上次的話題接 — 那已經太遠。
2. 找一個今天的錨點：節氣 [jieQi]、流年 [yearGanZhi]、或他最近一張命盤。
3. 一句短打招呼 + 一個聚焦問題即可。

**禁止**：「歡迎回來！」這種客服腔。也不要列舉之前說過什麼。
```

`gap`（現有）→ 保留作為 default fallback，向後相容。

### 3.4 Client wiring 變更

替換 `MasterChatContext.tsx` 中現有的 expand-effect（lines 343-358）為新的 dispatcher：

```typescript
// 舊：if (now - lastTs < PROACTIVE_GAP_MS) return; void triggerCheckin()
// 新：
const checkinDispatcher = useCallback(async () => {
  if (sendingRef.current) return
  if (Date.now() - proactiveLastFiredRef.current < PROACTIVE_COOLDOWN_MS) return
  if (messages.length === 0) return

  const last = messages[messages.length - 1]
  if (!last) return
  const lastTs = new Date(last.timestamp).getTime()
  if (!Number.isFinite(lastTs)) return
  const ageMs = Date.now() - lastTs

  // <5 min：絕不觸發
  if (ageMs < 5 * 60 * 1000) return

  proactiveLastFiredRef.current = Date.now()

  // Stage 1：CTA fast-path
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
    return  // <30min 未完成 → 不打擾
  }

  // Stage 2：結構分類
  if (last.role === 'user') {
    void runTurn({ checkin: 'unanswered_user' })
    return
  }
  if (last.role === 'assistant' && isClosed(messages, lang)) {
    return  // 沉默
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

`runTurn` 的 type signature 從 `{ checkin: true }` 擴成 `{ checkin: true | CheckinHint }`，server `body.checkin` 解析時保留 boolean 等同於 `'gap'`。

### 3.5 master.md 新增段落

在現有 "Reflection" section 之後加一節：

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

## 4. 不做的事 / Out of scope

- ✗ 不做 truly empty assistant response（master 沒話講就發短結尾）
- ✗ 不做 family-CTA 的精細 readingId 對位（phase 1 用 fuzzy match：since 後第一張同 type+target reading）
- ✗ 不引入 push notification 從 widget 外主動找用戶
- ✗ 不在 server 加新的 LLM call 做分類（fast-path 純 SQL；ambiguous 直接交 master 在主 turn 裡判斷）

---

## 5. 風險與監控

| 風險 | 監控方式 |
|---|---|
| `isClosed` 正則漏判 → 該沉默卻說話 | 看樣本：master 在已收尾對話中重複觸發 `ambiguous_resume` 的比例 |
| `cta_pending_aged` 太常觸發 → 用戶覺得被催 | 30 min 是初始值；可在 `MasterChatContext` 把它變 const 方便調 |
| `unanswered_user` 把舊訊息當「剛收到」回 → 答案脫節 | master.md 規則告誡「不要致歉」但要「對位用戶問題」；觀察 |
| 多裝置場景（手機 widget 收起、PC 完成排盤）同步延遲 | 現有的 `xuanji:readingsChanged` 事件 + GET cache: 'no-store' 已處理；activation check 會在 historyLoaded 後跑，拿到的是新資料 |
| Cooldown 5 min 在多分頁切換時是否合理 | 觀察是否頻繁觸發；可調至 10 min |

---

## 6. 實作順序

1. ✅ master.md 新增 "Activation" 段落
2. ✅ 新 endpoint `/api/master/cta-status/route.ts`
3. ✅ `route.ts` 改造：`buildCheckinAppendix(hint)` + body 解析
4. ✅ `MasterChatContext.tsx` 改造：替換 expand-effect 為 `checkinDispatcher`，加 `findLatestPendingCTA` / `isClosed` / `fetchCtaStatus` helpers
5. ✅ Vitest：給 `isClosed` 寫純函數測試（中英各 ~5 case）
6. ✅ typecheck + 跑 systemPrompt 測試（master.md 改了會影響）

---

**新 session 啟動建議第一句話**：「我要看 master 激活續接機制的設計／實作 → `docs/planning/activation-resume-design-2026-04-27.md`，client 在 `MasterChatContext.tsx` 的 `checkinDispatcher`，server 在 `/api/master/route.ts` 的 `buildCheckinAppendix(hint)`。」
