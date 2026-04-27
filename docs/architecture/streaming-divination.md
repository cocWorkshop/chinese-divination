# 占卜流式渲染 — 架構參考

> **狀態**：實作已上線，本文從原本的「session 交接文檔」轉為長期參考。記錄**邏輯架構、改動清單、預期行為、測試清單、已知風險**，方便新 session 0-context 也能快速理解流式排盤系統。

---

## 一、目標

把占卜（bazi/ziwei 為主）的 LLM 解卦從**60-120 秒空白等待**改造成**section-by-section 流式渲染** + **deterministic 排盤資料 0 秒可見**。

對未登入用戶，把廣告 landing 頁的潛在跳出點壓到最低（提交→秒見排盤→解讀邊打字邊出來）。

---

## 二、新加的核心模塊

### 1. 流式 JSON 解析器
**檔**：[src/app/api/divination/handlers/_streamingJsonParser.ts](../src/app/api/divination/handlers/_streamingJsonParser.ts)

**做什麼**：路徑感知的 char-level JSON 狀態機。LLM token 一個個流入，它一個個發事件出去：

| 事件 | 何時 emit | 載荷 |
|---|---|---|
| `value_chunk` | 字符串值在累積中（每來一個 char emit 一個） | `{ path, text }` |
| `value_done` | 一個值完整收完（string / number / bool / null） | `{ path, value }` |
| `done` | 最外層 `}` 或 `]` 閉合 | — |
| `error` | parse 不下去（未閉合字串、無效 literal、截斷） | `{ error }` |

**關鍵特性**：
- 容忍前綴 garbage：` ```json ` 代碼圍欄、解釋文字 — 直接跳到第一個 `{` 或 `[`
- 容忍後綴 garbage：閉合後進入 `postDoc` 模式靜默忽略
- 跨 chunk 的字串 / key 切割正常處理（字符級緩衝）
- `path` 是 `(string | number)[]`，物件 key 用 string，陣列 index 用 number

**測試**：[_streamingJsonParser.test.ts](../src/app/api/divination/handlers/__tests__/streamingJsonParser.test.ts) — 16 個案例覆蓋扁平/嵌套/陣列、跨 chunk 切割、轉義、原始類型、容錯。

### 2. 後端 streaming 路徑
**檔**：[src/app/api/divination/route.ts](../src/app/api/divination/route.ts)

**入口判斷**：`req.headers.get('accept')` 包含 `text/event-stream` → 走 streaming 分支；否則走原 `completeLLM` 阻塞分支（向後兼容）。本地 claude-proxy 不支持 streaming，自動 fallback。

**核心函數 `runStreamingDivination`**：
1. **`chart_ready` 事件先發**：跑 `handler.merge(seed, chart, ctx)` 把計算器結果合併到一個 fresh `seed: { type, version: 2 }`，發給前端。前端拿到 seed 直接攤平到 partial 的根層 — **四柱、藏干、十神、五行、大運、流年、神煞、空亡 t=0 立即可見**。
2. **streamLLM** token 流入 → `accumulatedRaw += chunk.text` + `parser.push(chunk.text, onParserEvent)`
3. **解析事件 forward**：onParserEvent 把 `value_chunk` / `value_done` 直接 forward 為 SSE 事件給前端
4. **後處理**：流結束後跑原本 blocking 路徑的同一套：`parseJsonFromLLMOutput(accumulatedRaw)` + `merge` + Zod + `prisma.reading.update` + `deductCredits`
5. **`done` 事件**：後處理完成後 emit 最終 server-validated 完整 reading

**SSE 事件協議**（前後端共識）：
```
{ type: 'chart_ready', seed }      // pre-merged calculator result
{ type: 'value_chunk', path, text }
{ type: 'value_done', path, value }
{ type: 'done', reading: { id, result }, saved }
{ type: 'error', error, status? }
```

**頂層 try/catch 防禦**：整個 start function 包在 try/catch 裡，任何意外異常都會：
- console.error 印完整 stack
- 標記 reading row `status: 'failed'`
- emit friendly `error` SSE 事件
- 安全 close controller

這是先前 reading 全部失敗的根因 — 之前 streaming 內部異常時控制器靜悄悄關閉，前端看到 stream 結束既無 `done` 也無 `error`，走 polling fallback 又找不到 completed reading，誤報"請求超時"。

### 3. 前端 SSE 讀取與漸進渲染
**檔**：[src/app/divination/[type]/page.tsx](../src/app/divination/[type]/page.tsx)

**doSubmit 重寫**：
1. POST `/api/divination` 帶 `Accept: text/event-stream`
2. 響應 content-type 不是 SSE → 走原阻塞 JSON 分支（local proxy fallback）
3. 是 SSE → 進讀流循環：
   - 維護 `partial: Record<string, unknown>`
   - `chart_ready` → `for (k,v) of seed.entries: partial[k] = v`
   - `value_chunk` → `mutateAtPath(partial, path, cur => (cur ?? '') + text)`
   - `value_done` → `mutateAtPath(partial, path, () => value)`
   - 每次更新調 `scheduleRender()` — RAF 節流，最多 ~60 fps 觸發 `setResult(JSON.stringify(partial))`
   - `done` → 拿 server-validated reading.result 替換 partial
   - `error` → toast.error
4. **三道 fallback**：
   - 響應非 SSE → JSON 分支
   - 流中斷 / 未收到 done → `pollForReadingById(pendingReadingId)`
   - fetch 拋異常 → 同樣 polling

**關鍵 helper**：`mutateAtPath(root, path, transform)` — 沿 path 走，缺位置就創建（陣列 / 物件 by next path 段判定），最後 leaf 套 `transform(existing) → new`。**就地 mutate**（不深拷貝），因為事件頻繁、shallow-clone 整棵樹會 reconciler 卡頓。

**渲染條件**（修了的衝突）：
```jsx
{loading && !streaming && !result && <LoadingOracle />}      // 等首字節
{(result || streaming) && <ResultRenderer streaming={streaming} ... />}  // 流入中或完成
```
之前是 `{loading && ...}{result && ...}` 兩個獨立條件，導致 streaming 期間 LoadingOracle 和 ResultRenderer 同時掛在頁面上。

### 4. ResultRenderer streaming 適配
**檔**：[src/components/results/ResultRenderer.tsx](../src/components/results/ResultRenderer.tsx) + [DivinationResultProps](../src/types/divination.ts)

新增 `streaming?: boolean` prop 透傳給每個 renderer。streaming 期間強制走 V2 layout（`version` 字段尚未到達時的保護）。

**改造為 vertical flat layout 的 renderer**：
- [BaziResultV2](../src/components/results/BaziResultV2.tsx) — sections 從 tab 改為縱向卡片堆疊；每張卡片的標題旁有 typing dots placeholder（streaming + 該段尚無內容時）
- [ZiweiResultV2](../src/components/results/ZiweiResultV2.tsx) — 同上
- [LiuYaoResult](../src/components/results/LiuYaoResult.tsx) — 同上（之前是 tab）

**未改造**（已是 vertical 或內容少不需要）：IChingResult / QimenResult / FengshuiResult / OtherResult — 它們本來就 top-down，靠 optional chaining 容忍 partial data。

**未改造但應該後續做**：BaziResult V1 / ZiweiResult V1 — 只用於顯示舊 reading（schema 註明 V1 是 backward-compat），新 reading 都走 V2，不會被 streaming 觸及。但用戶在 dashboard 看舊 reading 時仍是 tab UI，視覺不一致。

### 5. BaziResultV2 mobile 響應式
**檔**：[src/components/results/BaziResultV2.tsx](../src/components/results/BaziResultV2.tsx)

頂部 formation/dayMaster 區塊原本是 3 欄 flex 在手機螢幕擠成一團。改成：
- 手機（< 640px）：日主 badge 橫向排在一行，旁邊跟喜/忌；formation + 五行條獨佔一段；胎元/命宮/身宮在底部用 `border-t` 分隔的 wrap 行
- 桌面（sm+）：保留原 3 欄佈局

關鍵 class：
- 外層 `flex flex-col sm:flex-row`
- 五行條容器加 `min-w-0` 讓 flex 正確收縮
- 文本加 `break-words` 防超寬

---

## 三、附帶的支線改動（穩定性 / UX 修復）

| 問題 | 修法 | 檔 |
|---|---|---|
| `parseJsonFromLLMOutput` 失敗時把 raw text 塞進 `sections.overview`，騙過硬拒絕，讓 raw JSON 顯示在頁面上 | 改為 emit `{ __parseFailed: true, rawText }` marker，路由顯式拒絕 | [_jsonParse.ts](../src/app/api/divination/handlers/_jsonParse.ts) |
| streaming parser 對截斷 JSON 報 error，跟 parseJsonFromLLMOutput 的修復邏輯衝突，誤拒 | 移除 streaming parseError 在硬拒絕條件中的權重，只 console.warn | [route.ts](../src/app/api/divination/route.ts) |
| 廣告 landing 跳轉 → showReadingCard 指向不存在的 `/dashboard/reading/{id}` | 改成 `/dashboard?reading={id}` + 在 dashboard 加 useSearchParams + auto-expand + scroll | [showReadingCard.ts](../src/lib/master/tools/showReadingCard.ts) + [dashboard/page.tsx](../src/app/dashboard/page.tsx) |
| /login 不認 `?next=` 參數，登入後一律跳 /divination | login 加開放重定向防護的 next 處理 | [login/page.tsx](../src/app/(auth)/login/page.tsx) |
| 未登入用戶在 /divination/{type} 看到的表單缺好幾個區塊（CTA、機緣、隱私、排盤 only） | 加並排的 logged-out placeholder 卡片，視覺對齊登入後狀態 | [divination/[type]/page.tsx](../src/app/divination/[type]/page.tsx) |
| 首頁缺玄機大師入口 | 加廣告引流 section，CTA 跳 `/login?next=/divination` | [page.tsx](../src/app/page.tsx) |

---

## 四、八字計算器擴充

**檔**：[src/lib/baziCalculator.ts](../src/lib/baziCalculator.ts)

對應 user message JSON（給 LLM 的 prompt 上下文）增加四類結構性數據：

| 字段 | 類型 | 用途 |
|---|---|---|
| `branchRelationships.triCombines` | `{ branches, pillars, element, kind: 'full'\|'half'\|'gong' }[]` | 三合局/半合/拱合識別 |
| `branchRelationships.threeWayMeets` | `{ branches, pillars, element, direction, kind: 'full'\|'half' }[]` | 三會/方局識別 |
| `jieLu` | `{ jieLuBranches, affectedPillars, description }` | 截路空亡（按日干查表） |
| `tenGodStrength` | `{ god, transparent, rooted, inSeason, count }[]` | 每個十神的透干/通根/月令三項信號 |

對應 prompt 寫法（[bazi.ts](../src/app/api/divination/handlers/personal/bazi.ts) + [ziwei.ts](../src/app/api/divination/handlers/personal/ziwei.ts)）也改了：明確要求每個 sections 子段引用具體神煞/十神/三合等結構性證據，而不是泛泛而談"日主強弱"。

---

## 五、新 Session 測試清單

新 session 加上 Playwright MCP（`claude mcp add playwright npx @playwright/mcp@latest`）後，按下面順序驗證：

### A. 編譯 / 啟動
1. `npx tsc --noEmit` — 應靜默通過
2. `npx vitest run` — 應全綠（最後測 561 passed）
3. `npm run dev` — 應啟動到 http://localhost:8088 無錯

### B. 八字 streaming 端到端（核心）
1. 登入測試帳號
2. 進 `/divination/bazi`
3. 填生辰，提交
4. 預期 timeline：
   - **t=0~3s**：LoadingOracle 短暫顯示
   - **t=3~5s**：LoadingOracle 消失，**完整四柱表 + 藏干 + 十神 + 五行條 + 大運 + 流年時間軸 + 神煞** 全部立即可見
   - **t=5~15s**：sections 卡片顯示標題 + "玄機正在書寫..." 占位 + 三點動畫
   - **t=15~90s**：sections 一段段填字，可見字符級流入
   - **t=90~120s**：daYunAnalysis 八步逐個展開
   - **完成**：placeholder 消失、底部 ReadingFeedback 出現
5. 檢查 Network tab：`/api/divination` 響應 content-type `text/event-stream`，看到大量 `value_chunk` / `value_done` 事件，最後一條 `done` 事件
6. 檢查 console：應該無 error；可能有 warn（streaming parser truncated 是正常的，會 console.warn）

### C. 移動端響應式
1. Chrome DevTools → Toggle device toolbar → iPhone 12 Pro 或類似
2. 進占卜 result 頁
3. 預期：
   - 頂部 formation 區塊單列堆疊，日主 badge 橫向加喜/忌
   - 五行條不擠
   - daYun 卡片可滑動展開
   - sections 文字 break-words 正常

### D. 錯誤回退
1. 手動殺掉 LLM connection（network throttle / 斷網中段）
2. 預期：toast 顯示具體錯誤；reading 在 DB 標記 failed；console 印 `[divination/stream]` 開頭的 stack

### E. 未登入流程
1. 未登入時直接訪問 `/divination/bazi`
2. 預期：表單 + 4 個帶 🔒 的 placeholder 卡片
3. 點任意 placeholder → 跳 `/login?next=%2Fdivination%2Fbazi`
4. 登入後預期回到 `/divination/bazi`

### F. Master chat（這個 session 也改了，順手驗）
1. 提交一個 reading
2. 看 master widget 的 CTA / reading 卡片是否在文字打完後才彈出
3. 卡片之間是否有 ~700ms 的「正在打字」停頓

---

## 六、已知風險與可疑點

1. **LLM 欄位輸出順序**：streaming 的 section-by-section 視覺體驗依賴 LLM 按 prompt 模板順序輸出。Claude / GPT-4 通常遵守，OpenRouter 上其他 model 不保證。即使亂序，視覺 OK（每段獨立卡片），但用戶看到 daYun 比 overview 先到會略奇怪。
2. **Cloudflare / 反向代理 buffering**：生產環境若有 nginx / Cloudflare 代理，要確認 SSE 響應不被 buffer。`text/event-stream` 大多數代理會自動 flush，但要驗。
3. **大量 setState 在 mobile 的性能**：已用 RAF 節流壓到 ~60fps。大段 sections（200+ 字）可能還是有點 jank，特別是低端機。要關注。
4. **V1 renderer 與 V2 視覺不一致**：舊 reading 在 dashboard 仍是 tab 佈局，新 reading 是 vertical flat。產品上可接受，視覺潔癖會難受。
5. **prompt 變長導致 LLM token 超 budget**：bazi/ziwei 的 prompt 加了大量"必須引用"的指示。若 LLM 輸出超 maxTokens，會被截斷。streaming JSON parser 的容錯能撈一些，但仍可能出 `Zod validation issues`。
6. **頂層 try/catch 的 race condition**：理論上 `await prisma.reading.update` 之後 `controller.close` 前若有什麼東西先把 controller 關了，第二次 close 會被吞（已 wrap 在 try/catch 中）。應無問題但值得關注。

---

## 七、本次 session 沒做但下一輪可以接的

- 用 Playwright MCP 做自動化端到端 streaming 測試
- BaziResult V1 / ZiweiResult V1 改 vertical flat（視覺統一）
- ZiweiResultV2 mobile 響應式（這次只改了 BaziResultV2）
- 其他 renderer（IChing/Qimen/Fengshui）的 mobile 細節
- 廣告 landing 頁專用路由 `/start` （之前討論過的 4-view funnel）
- 後端 SSE 事件加 `keep-alive` 心跳，防止某些代理在長靜默時斷線

---

## 八、新 session 啟動建議第一句話

> 「我要動到流式排盤的 [具體事項]。先讀 [docs/architecture/streaming-divination.md](../architecture/streaming-divination.md)，重點看 §一 目標、§二 核心模塊（streaming JSON parser + chart_ready）、§六 已知風險。」
