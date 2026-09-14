# 玄機 — 2026-06 綜合架構與 UIX 變更記錄 (Changelog)

> 本文檔整合了 2026-06-12 重構衝刺期間產生的 11 份分項變更日誌（Phase 0 ~ Phase 2 及 UIX W0 ~ W5），作為長期歷史存檔與追溯索引。

---

## 目錄

1. [Phase 0 — 代碼質量與容器基線 (I3, I10a, I12, I13, I16)](#一phase-0--代碼質量與容器基線)
2. [Phase 1 — 可觀測性與邊界校驗 (I6, I7, I11, Sentry)](#二phase-1--可觀測性與邊界校驗)
3. [Phase 2 — 核心架構與計費競態重構 (I5, I8, I9, I14)](#三phase-2--核心架構與計費競態重構)
4. [UIX 專項 — 無障礙、國際化與長調用體驗優化 (W0 ~ W5)](#四uix-專項--無障礙國際化與長調用體驗優化)

---

## 一、Phase 0 — 代碼質量與容器基線

### 1. 代碼風格與測試門禁 (I3)
- **ESLint & TS 配置**：新增 `.eslintrc.json`（繼承 `next/core-web-vitals`，啟用 `@typescript-eslint`，安裝 `eslint@^8.57.0` 與 `eslint-config-next@^14.2.35`）。
- **package.json 腳本擴展**：
  - `npm run type-check` (`tsc --noEmit`)
  - `npm run test` (`vitest`) / `npm run test:unit`（排除需連本地 DB 的 integration 測試）/ `npm run test:ci`（全量測試）
  - `npm run predeploy-check` (`type-check + lint + test:ci` 三重門禁)
  - `db:push` 增加 drift 告警。
- **排印修正**：將 CJK 文本中的 ASCII 引號替換為標準全角引號 `“”`。

### 2. 管理員鑑權統一 (I10a)
- 將 `api/admin/feedback` 與 `api/admin/site-feedback` 的內聯權限檢查替換為統一的 `requireAdmin()`（`src/lib/adminAuth.ts`），至此全部 ~34 個 admin 路由收歸同一鑑權邊界。

### 3. 環境變數強校驗 (I12)
- 新增 `src/lib/env.ts`（基於 Zod 的 23 個環境變數模式校驗，在 `src/lib/prisma.ts` 中副作用載入）：
  - 生產環境缺少必填項時啟動失敗並打印缺少變數名稱（Fail-Fast）。
  - 核心必填項：`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`。
- 重寫 `.env.example`，補齊 Stripe 金鑰與模型變數文檔。

### 4. 容器運維與內存防護 (I13)
- **Dockerfile**：移除 runtime 階段在線 `npm install`；改由 builder 階段拷貝 lockfile 鎖定的 `prisma` 與 `effect` 二進制/庫。
- **docker-compose.yml**：新增 `mem_limit: 2g`（防內存洩漏拖垮宿主機），新增 `/api/config/nav` 健康檢查（`start_period: 90s` 覆蓋開機遷移）。

---

## 二、Phase 1 — 可觀測性與邊界校驗

### 1. 結構化日誌與請求追蹤 (I6)
- 新增 `src/lib/logger.ts`（基於 Pino 的 stdout JSON 日誌輸出）。
- 引入全局關聯標識 `requestId`：貫穿 Next.js API Routes → LLM 調用 → `LlmLog` 數據庫記錄（數據庫新增 `LlmLog.requestId` 索引欄位）。
- 日誌定位：`docker logs chinese-divination | grep '"requestId":"<ID>"'`。

### 2. Sentry 異常監控集成
- 採用手動裝配方案：`src/instrumentation.ts`（服務端/Edge）+ `src/components/SentryClientInit.tsx`（客戶端），避免 Next 14 App Router 下 `withSentryConfig` 導致的 build 失敗。
- 默認由 `SENTRY_DSN` 門禁控制，未配時自動靜默。

### 3. 進程內定時任務與隱私清理 (I7)
- 新增 `src/lib/jobs/`：輕量進程內定時器，由 `instrumentation.ts` 在開機 5 分鐘後首次觸發，隨後每日自動執行。
- **日誌清理 Job (`logRetention`)**：超過 90 天的 `LlmLog` 自動置空 PII 欄位（`inputPreview`/`outputPreview`/`systemPrompt`），保留 Token 與耗時指標；清理 >365 天的 `AuthLog`。

### 4. 輸入邊界校驗 (I11)
- 引入 Zod 對 `/api/profile`、`/api/family-members`、`/api/readings/[id]/chat` 進行強類型與數值範圍校驗（經緯度區間、字符長度上限、非法 JSON 防禦）。

---

## 三、Phase 2 — 核心架構與計費競態重構

### 1. 占卜流水線收斂 (I8)
- 新增 `src/app/api/divination/_finalize.ts`：將原本在阻塞式與流式路徑中重複的「解析 → 門禁過濾 → 合併計算器數據 → Zod 校驗 → 入庫 → 結算扣費」統一收斂為單一管道。
- 新增 `src/lib/sse.ts`：抽象標準 SSE 封裝（心跳、安全發送、優雅關閉）。

### 2. 解讀生命週期與自動補償服務 (I9)
- 新增 `src/lib/readings/lifecycle.ts`：統一封裝 `markCompleted`、`markFailed`、`refundHold` 與 `cleanupStaleReadings`。
- 單贏家 SQL CTE 保證併發退款只發生一次；將超時 Pending 掃描從用戶 `/init` 請求路徑移至後台 Job（每 10 分鐘一次），且超時未完成時主動退款。

### 3. 機緣預扣機制 (I5 — 徹底修復 TOCTOU 計費競態)
- **數據庫遷移**：`Reading` 表新增 `creditsHeld INT NOT NULL DEFAULT 0`。
- **原子扣減**：`/api/divination/init` 在創建 pending 解讀時**原子預扣**機緣點數並記錄在 reading 上。
- **安全保障**：成功則預扣直接轉為消費；任何環節失敗（LLM 超時、解析異常、進程崩潰、客戶端中止）均由 lifecycle 服務全額自動退款。
- 經 `creditReservation.test.ts` 併發測試驗證：併發扣款永不為負，併發退款只付一次。

### 4. 類型化事件總線與 Hooks 清理 (I14)
- 新增 `src/lib/events.ts`：提供強類型的 `xuanji:*` 全局事件發布/訂閱機制（dashboard、portrait、流式狀態）。
- 修復了代碼庫中全部 `react-hooks/exhaustive-deps` 警告，實現 `npm run lint` 0 錯誤 0 警告。

---

## 四、UIX 專項 — 無障礙、國際化與長調用體驗優化

### W0 — 快速修復與基礎防護
- **多語言錯誤頁**：`src/app/divination/error.tsx` 實現雙語本地化。
- **Stripe 錯誤處理**：修復結算異常時前端 loading 無響應問題，增加錯誤 Toast。
- **大師彈窗互動**：支持 `Escape` 鍵關閉展開視窗，並將焦點安全回退至 FAB。
- **打斷冷卻倒數**：大師打斷超出 6次/60秒 時，在輸入框上方顯示實時倒計時提示條。

### W1 — 無障礙基建 (Accessibility)
- **動效偏好尊重**：新增 `MotionProvider.tsx`，在系統設定減少動態效果時全域壓制 CSS 動畫與 Framer Motion 過渡。
- **鍵盤導航**：`BirthplaceInput` 重構為標準 WAI-ARIA Combobox（支持上下鍵盤選中、Enter 確認、Esc 關閉）；MemoryGateModal 實現焦點捕獲。
- **語義化改造**：占卜類型卡片改用標準 `<Link>`；紫色/八字五行條補充純文本與角標說明，杜絕僅依賴色彩傳遞資訊。

### W2 — i18n 輕量架構整合
- 新增 `src/lib/i18n/index.ts`：收斂項目中散落的 34 個局部 `T()` 函數；提供標準 `formatDate`、`formatDateTime`、`formatNumber` 等 Intl 封裝。
- 增加 `scripts/check-i18n.sh` 腳本防止重複定義。

### W3 — 超長 LLM 調用體驗保障
- **誠實進度條**：耗時超過 180 秒時不再卡死在 95%，而是按 95%→99% 漸進推進並顯示「深度推理中（已 N 分鐘）」。
- **主動超時取消**：超過 300 秒後提供「取消並返回表單（已填資料會保留）」操作。
- **表單草稿持久化**：`useDivinationForm` 實現 800ms 防抖本機草稿儲存，用戶意外關閉分頁後可完整恢復輸入內容。
- **精確失敗原因告知**：解讀失敗時，依據錯誤特徵給出超時、限流、格式異常或網絡波動的中文解釋與應對指引。

### W4 — 移動端與 Capacitor 適配
- 展開的大師視窗頂部增加 `env(safe-area-inset-top)` 安全區保護，適配瀏海螢幕。
- 平板寬度（768–1023px）展示緊湊型導航欄，核心入口不再隱藏至漢堡菜單中。
- 全局觸控熱區擴展至標準 44×44px。

### W5 — 輸出質感與體驗閉環
- **專業列印樣式**：新增 `@media print` 樣式，隱藏導航與背景星空，深色調轉為黑白乾淨排版，支持用戶一鍵保存/列印命盤。
- **空狀態引導**：Dashboard 歷史記錄為空時，提供明確的下一步指引與占卜入口按鈕。
