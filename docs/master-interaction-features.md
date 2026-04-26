# 玄機大師 — 互動體驗機制

記錄三個讓 master chat「像在跟真人聊天」的機制：**打斷與追問**、**用戶取消 CTA**、**閒置反思**。三者共用同一條 `runTurn` 路徑，差異只在 payload + state 機。

---

## 1. 打斷與追問（Interruption / Follow-up）

### 場景

用戶在 master 還在 streaming 輸出時，又想說點什麼。兩種情境：
- **A. LLM 已經吐字**：master 講到一半，用戶「等等，我問的是…」
- **B. LLM 還沒吐字**：剛 POST 出去、token 還沒回來，用戶補了一句「對了還有…」

兩種情境共用同一條代碼路徑：用戶輸入入隊 → debounce 1500ms → flushPendingSends 偵測 in-flight → abort + 重新 runTurn。

### 數據流

```
用戶打字 → sendMessage()
            ↓ 入 pendingSendsRef + 顯示 user 氣泡
            ↓ 重置 BURST_DEBOUNCE_MS (1500ms) 計時器
            ↓
      [1500ms 用戶停止輸入]
            ↓
       flushPendingSends()
            ↓
       sendingRef.current === true？
       ├─ NO  → runTurn(queued) 普通流程
       └─ YES → 進入「打斷」分支
                ↓
                rate-limit 檢查（60s 內最多 6 次打斷）
                ├─ 超限 → toast「打斷過於頻繁」+ 丟棄 queue
                └─ 通過 → 繼續
                          ↓
                          標記前一條 assistant 訊息加 `*…(被打斷)*` 後綴
                          ↓
                          abortRef.current.abort()  ← 取消 fetch
                          ↓
                          await turnDoneRef.current  ← 等舊 runTurn cleanup
                          ↓
                          runTurn(queued)  ← 啟新一輪含用戶新輸入
```

### 關鍵 ref / 常量

| 名稱 | 位置 | 作用 |
|---|---|---|
| `sendingRef.current` | MasterChatContext | true = 有 turn 在跑 |
| `abortRef.current` | MasterChatContext | 當前 fetch 的 AbortController |
| `turnDoneRef.current` | MasterChatContext | 當前 turn 的 cleanup Promise；abort 後 await 它確保 sendingRef 已 reset |
| `interruptHistoryRef.current` | MasterChatContext | 滑動 60s 窗口內所有打斷的 timestamp |
| `MAX_INTERRUPTS_PER_WINDOW = 6` | MasterChatContext | 60s 內合法打斷上限 |
| `INTERRUPT_WINDOW_MS = 60_000` | MasterChatContext | 滑動窗大小 |

### 為什麼不需要改 server

- master 路由的 user message 是在 stream **開始前**寫入 DB 的
- assistant turn 是在 stream **結束時**寫入 DB 的
- abort 發生在中間 → DB 有用戶舊訊息但沒有半條 assistant turn → 沒有污染
- 新一輪 runTurn 從 DB 讀的 history 是完整的；連續兩條 user role 訊息（舊的+新的）合在一起，OpenAI / Anthropic 都能正常處理，自然當作"用戶補充說明"重新作答

### 為什麼用 turnDoneRef + Promise 而不是 polling

舊 runTurn 的 finally block 末尾呼叫 `resolveTurn()`。新 runTurn 的 `if (sendingRef.current) return` 早 bail 永遠不會誤觸發，因為 `await turnDoneRef.current` 已經保證了 cleanup 完成。比 `while (sendingRef) await sleep(50)` 精確 O(1)。

### 已扣機緣 vs 重做

每次 `runTurn` 都對應 server 端一次 `deductCredits` 呼叫。打斷 + 重啟 = 扣兩次。**這是有意的**：
- 用真錢做天然速率限制
- 真實的"我打斷想補充"通常 1-2 次封頂
- 惡意刷打斷會花錢 → 自我修正
- 上面那個 `MAX_INTERRUPTS_PER_WINDOW` 是冗餘上限（60s 內最多扣 6 次機緣）

---

## 2. 用戶取消 CTA（Pending-reading reversal）

### 場景

master 發了一張 CTA 卡片（例如「點下面這個給你太太排八字」），用戶點開了 form 頁面，反悔，不想填了。原本 master 會卡在 `pendingReading` 狀態無限等待，沒有任何方式叫他放下。

### UI

折疊狀態的 master 底欄在 `pendingReading` 期間顯示：

```
🧙‍♂️  ●  候您完成八字排盤 · 完成後自動續接              [✕]
```

- 主區（avatar + 狀態文字）：點擊回到 form 頁
- 右側 `✕`：點擊 → confirm 對話框 → 確認後取消

### 數據流

```
用戶點 ✕ → window.confirm「要放棄這次八字占卜嗎？」
              ↓ 確認
        cancelPendingReading()
              ↓
        setPendingReading(null)
              ↓
        runTurn({ messages: ['[用戶取消] 用戶取消了 X 的占卜...'] })
              ↓
        master 收到合成 user message → 走 master.md 的「user cancelled」分支
        → 回覆「好，先放下這個」+ 換話題
        → 不再發出相同 CTA
```

### Master 端行為（master.md 規定）

收到 `[用戶取消]` 訊息時：
1. 簡短承認（"好，先放下這個"）
2. **不要重複發出相同的 CTA**
3. 用現有資料回應，或換話題

### 關鍵點

- `xuanji:readingComplete` 與 `[用戶取消]` 是兩個對稱信號 — 一個告訴 master「成功了，繼續」，一個告訴 master「失敗了，放下」
- 兩個信號都是合成 user message，server 端跟普通 user 訊息一樣處理（持久化到 DB）
- 多步驟 CTA 流程下（例如八字合盤需要本人 + 配偶 + 父母三張盤），用戶可以取消其中任何一張，master 會接受並繼續工作

---

## 3. 閒置反思（Idle Reflection）

### 場景

用戶在展開的對話框裡停了下來（不是關閉，是還在看著螢幕），90 秒沒有輸入。master 掃一眼最近 3-5 輪對話，找一個值得補充的東西，自己接一兩句話。

兩個典型情境：
- **A. 補充說明**：master 答完問題後想到「對了，剛才提到的 X 其實還可以說 Y」
- **B. 接住沒收尾的話頭**：master 之前開了個話頭沒講完

### 一次性原則

- 90 秒沒輸入 → master 反思一次（不管說沒說有用的東西）
- 反思之後再 90 秒沒輸入 → **不再反思**（我們判定用戶離開了）
- 用戶下次再輸入任何東西 → 計數器歸零，下次 idle 又可以反思一次

這個 "ONE-SHOT per silent stretch" 原則是核心，避免顯得需要陪伴或者霸佔注意力。

### 狀態機

```
States (per chat session):
- READY       reflection_attempts === 0, can reflect on next idle
- DEAD        reflection_attempts === 1, no more reflection until user types

Transitions:
  master reply finished + widget expanded → schedule 90s timer
  user types (any non-reflection turn fires) → reset counter to 0 (back to READY)
  90s timer fires + READY + still expanded + master not busy → trigger reflection turn
  reflection turn fires → counter += 1 → DEAD
  widget collapsed → cancel timer (state preserved)
  widget re-expanded → useEffect refires → re-schedules if state allows
```

### 數據流

```
master 回覆 done → loading=false
          ↓
   useEffect 偵測到 (loading=false + last msg=assistant + expanded)
          ↓
   scheduleReflection()
          ↓
   reflectionAttemptsRef.current >= 1?
   ├─ YES → return (DEAD)
   └─ NO  → setTimeout 90_000ms
                ↓
            [計時]
            ├─ 用戶打字 → flushPendingSends → runTurn({ messages }) 
            │                                ↓
            │                          重置 reflectionAttemptsRef = 0
            │                          下個 useEffect cycle 重新排程
            │
            └─ 計時器到期 → triggerReflection()
                              ↓
                        reflectionAttemptsRef.current += 1  (= 1)
                        runTurn({ reflection: true })
                              ↓
                        POST /api/master with reflection: true
                              ↓
                        backend 注入「## 反思時刻」appendix 到 system prompt
                        + 注入合成 user msg `[reflection_trigger]`
                              ↓
                        LLM 流回應；持久化跟普通 turn 一樣
                              ↓
                        loading=false 又觸發 useEffect → scheduleReflection
                              ↓
                        但 reflectionAttemptsRef.current === 1 → return (DEAD)
```

### 關鍵 ref / 常量

| 名稱 | 位置 | 作用 |
|---|---|---|
| `reflectionTimerRef.current` | MasterChatContext | setTimeout handle |
| `reflectionAttemptsRef.current` | MasterChatContext | 0 = READY, 1 = DEAD |
| `REFLECTION_IDLE_MS = 90_000` | MasterChatContext | 反思觸發前的閒置時間 |

### 為什麼是 90 秒

太短：用戶剛看完一段話、還在消化、master 又冒出來打擾
太長：用戶已經離開了，反思白白消耗一次 LLM 呼叫

90 秒是「讀完一段中等長度的回答 + 短時間思考」的合理分位。如果觀察到太多反思 LLM 沒人理（DB 統計 reflection 後 N 分鐘內無 user 回覆的比例），可以調長。

### Master 端行為（master.md 規定）

收到 `[reflection_trigger]` 時：
1. 掃最近 3-5 輪對話，找 ONE 個具體值得補的東西
2. 找到了 → 「對了 / 我再想了一下」開頭，1-2 個短氣泡，**留空白**收尾（不要硬問問題）
3. 找不到值得補的東西 → 一句短結尾打住（"先這樣，你想到什麼再說。"）
4. 硬規則：最多 2 個氣泡；不打招呼；不總結之前說過的；不問「還有什麼想問的嗎」

### 為什麼一定要"沒值得說的就閉嘴"

LLM 默認傾向：被觸發了就要說點什麼，避免空白。對普通對話這是好事，對反思這是災難——強行擠出來的反思會顯得 master 不安、需要存在感、像個業務員。寧可錯過也不要硬擠。

prompt 裡明確「找不到 → 一句短結尾打住」是為了給 LLM 顯式許可：可以什麼都不說。

### 為什麼「反思之後不再反思」

如果反思了，用戶沒回，那就兩種可能：
- A. 用戶真的已經離開了
- B. 用戶在思考，還會回來

兩種情況下，**繼續反思都是錯的**：
- 對 A：浪費 LLM 呼叫
- 對 B：用戶正在好好想，master 又冒出來會打斷思路

所以一次就夠。下次用戶主動回來 → 重置 counter → 又可以反思一次。

### 折疊 / 展開的處理

- `shape !== 'expanded'` 時不安排反思（用戶沒在看，發了也沒人看到）
- 但 counter 不重置 — 用戶展開後如果之前已經反思過了，仍然 DEAD
- 如果想「展開即重置」可以再加邏輯，但目前的行為更保守：用戶手動發訊息才證明真的回來了

---

## 三者的共通協議

### 同一條 `runTurn` 入口

```ts
runTurn(payload: 
  | { messages: string[] }   // 用戶 active turn（包括追問、合成的 readingComplete / 取消訊息）
  | { checkin: true }        // 主動開場
  | { reflection: true }     // 閒置反思
)
```

POST 到 `/api/master` 的 body 對應 `messages: string[]`、`checkin: true`、`reflection: true`。後端用對應的 prompt appendix 包裝。

### 同一個 SSE 事件協議

跟 streaming 部分一樣：`content` / `bubble_break` / `tool_start` / `tool_end` / `cta_card` / `reading_card` / `done` / `error`。前端收到 event 的處理跟普通 turn 完全一樣。

### 同一個 turn lifecycle (`turnDoneRef`)

任何 turn（不管 user / checkin / reflection）的 `runTurn` 都會：
1. 開頭：`sendingRef = true`，建立 `turnDoneRef = new Promise(...)`
2. finally：`resolveTurn()`，`sendingRef = false`，`setLoading(false)`

打斷邏輯永遠 await `turnDoneRef.current`，無視當前 turn 是哪種類型 → 統一處理。

### 不會互相重入

- 任何 runTurn 的 `if (sendingRef.current) return` 早 bail 防止重入
- 反思的 schedule 在 `if (sendingRef.current) return` 也會 bail，避免在 master 還在說話時插隊

---

## 速率 / 成本評估

| 動作 | 觸發頻率上限 | 每次成本 |
|---|---|---|
| 用戶 sendMessage | 受 1500ms debounce + LLM 回應時間限制 | 1 次 LLM 呼叫 + 機緣 |
| 用戶打斷 | 60s 內最多 6 次（rate limit） | 同上 |
| 取消 CTA | 用戶手動觸發，需 confirm | 同上 |
| 主動 checkin | 開啟 widget 時，2h gap + 5min cooldown | 同上 |
| 閒置反思 | 90s 後自動觸發，每靜默期最多 1 次 | 同上 |

最壞情況：用戶開了 widget → master 反思（1 次） → 用戶答 → master 答 → 用戶閒置 → 反思（1 次）→ 答 → ... 每輪對話最多多耗 1 次 LLM。對機緣消耗的影響可控。

---

## 改動文件索引

- [divination-refs/master.md](../divination-refs/master.md) — 持久化 prompt 規則：Reflection 章節 + 多步驟 CTA / cancel 分支處理
- [src/app/api/master/route.ts](../src/app/api/master/route.ts) — 後端：`reflection: true` body 識別、`buildReflectionAppendix(lang)` 函數
- [src/lib/master/turnEngine.ts](../src/lib/master/turnEngine.ts) — 引擎：`isReflection` flag → 注入 `[reflection_trigger]` 合成 user message
- [src/components/master/MasterChatContext.tsx](../src/components/master/MasterChatContext.tsx) — 前端：
  - `turnDoneRef` / `interruptHistoryRef` (打斷)
  - `cancelPendingReading()` (取消 CTA)
  - `reflectionTimerRef` / `reflectionAttemptsRef` / `scheduleReflection` / `triggerReflection` (反思)
- [src/components/master/widget/CollapsedBar.tsx](../src/components/master/widget/CollapsedBar.tsx) — UI：取消 CTA 的 ✕ 按鈕

---

## 下一步可改進的點

1. **打斷時保留 server 端的部分 assistant turn**：當前打斷時前端標記 `*…(被打斷)*`，但 server 端不持久化半條 turn。如果想讓「被打斷」的內容也進 chat history（給後續 turn 提供更完整的脈絡），需要在 abort 時讓 client 把已收到的部分 content 傳給 server 做 truncated save。
2. **反思時間自適應**：根據 portrait 學到「這個用戶通常多快回應」動態調整 90s。慢速思考的用戶可以給 120-150s，快速對話的可以縮到 60s。
3. **反思的「值不值得」判斷下推到 server**：當前是 prompt 規則 + LLM 自覺。可以加一道 server 端輕量分類（基於最後一條 assistant 內容的長度 / 訊息數），如果 chat 很短就直接跳過反思 LLM 呼叫，省一輪 token。
4. **取消後的 grace period**：用戶取消 CTA 後 5 分鐘內，master 不要再 emit 同類型的 CTA（即使 prerequisites 還在缺）。需要前端記憶「最近取消的 type」並在 system prompt 加 hint。
