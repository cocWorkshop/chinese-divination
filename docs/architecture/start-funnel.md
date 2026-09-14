# /start 廣告漏斗 — 設計、實作與運維文檔

寫於漏斗 v1 完成。記錄**目標、5-view 結構、資料流、Schema 改動、Auth 雙軌、AdminSetting 鈕、運維/admin 介面、視覺風格、測試、未做事項**，方便新 session 0-context 接續，也作為日後擴展（A/B 測試、更多漏斗變種、Pixel 接入）的參照。

---

## 一、目標 & 設計準則

**目標**：用最少摩擦把廣告流量從「點 ad → 落地 → 看到價值 → 完成註冊」串起來，使用既有的機緣（Karma）計費模型，不引入新的 SKU。

**準則**：
1. **試用先於註冊**：用戶看到自己的命盤後再被要求設密碼。匿名期間用 funnel cookie 識別。
2. **email 驗證不可繞過**：完成 funnel ≠ 自動驗證。發信 → 用戶點連結 → 才能 login。避免攻擊者用他人 email 註冊 + 占據真實郵箱。
3. **試用成本可控**：每個 email 一次性試用機緣（10 點預設，AdminSetting 可調），不重複授予。
4. **失敗的引導不擋未來註冊**：tentative 用戶可被 90 天 cron 清掉；手動清也行；同 email 二次嘗試只「resume」不重新發機緣。
5. **視覺一致**：funnel 內全部走「數位道場」風格（深空 + 金 + 流式動效），跟主站既有的玄學詞彙無縫接軌；funnel 外（dashboard / login）走主站風格。

---

## 二、5-view + 1-splash 結構

| # | 路由 | 任務 | 關鍵元素 |
|---|---|---|---|
| 1 | `/start` | 鈎子 | typewriter hero、CTA 金光暈 |
| 2 | `/start/cast` | 收集生辰 + email | 4 欄表單，stagger 進場 |
| 3 | `/start/reading/[id]` | 流式試用排盤 | 四柱**墨滲式**揭露、總覽 + 事業運流式打字、5 段鎖（橫掃 shimmer） |
| 4 | `/start/master/[id]` | 玄機大師 demo | checkin 自動開場、3 chips、流式打字 + 終端游標、3 賣點 |
| 5 | `/start/unlock/[id]` | 設密碼 + 完成註冊 | 卡背金光暈、密碼強度檢查 |
| 5b | `/start/verify-sent` | 「請查收驗證信」splash | 呼吸卷軸 icon、resend 按鈕 |

**轉化目標**：從 View 1 點擊到 View 5b 完成註冊。**付費**不在這條路徑內 —— 50 機緣贈點足以讓用戶在 dashboard 探索完整命盤 + 一些大師對話；耗光後走既有 `/subscribe` 補充。

**進度條**：每個 view 都有 [`<StepIndicator>`](../src/components/start/StepIndicator.tsx)（5 點，當前點變寬發光金色）。

---

## 三、端到端資料流與狀態轉移 (Data Flow & State Transition)

```mermaid
flowchart TD
    Ad["廣告流量 (UTM 追蹤)"] --> V1["View 1: /start<br/>(寫入 sessionStorage xj_utm)"]
    V1 -->|點擊 CTA| V2["View 2: /start/cast<br/>(收集生辰 + Email)"]
    
    V2 -->|POST /api/start/init| InitRoute["/api/start/init 閘口<br/>• upsert User (tentative=true, credits=trialCredits)<br/>• 建立 Reading (status=pending, type=bazi)<br/>• 簽發 Set-Cookie: xj_funnel_session = HMAC(userId+exp)"]
    
    InitRoute -->|返回 readingId| V3["View 3: /start/reading/[id]<br/>(流式試用排盤)"]
    V3 -->|POST /api/divination (Cookie Auth)| SSE1["SSE Stream:<br/>• chart_ready (四柱墨滲)<br/>• overview & career 解讀流式打字<br/>• 其餘 5 個章節顯示鎖定 Shimmer"]
    
    SSE1 -->|點擊下一步| V4["View 4: /start/master/[id]<br/>(大師 Demo 互動)"]
    V4 -->|POST /api/master (Cookie Auth)| SSE2["大師對話 Stream:<br/>• 自動 checkin 開場問候<br/>• 3 個快速對話 Chip<br/>• 消耗 trial credits (1點/輪)"]
    
    SSE2 -->|點擊解鎖全部| V5["View 5: /start/unlock/[id]<br/>(設密碼 + 轉化)"]
    V5 -->|POST /api/start/complete| CompleteRoute["/api/start/complete 轉正<br/>• User tentative 轉 false<br/>• 原子發放 Welcome 註冊機緣 (50點)<br/>• 關聯 Reading 歸屬<br/>• 發送 Resend 郵件驗證信<br/>• 清除 funnel cookie"]
    
    CompleteRoute -->|跳轉| V5b["View 5b: /start/verify-sent<br/>(查收信件 Splash)"]
    V5b -->|用戶點擊郵箱連結| Verified["驗證成功 → /login → /dashboard<br/>(暢享完整解盤與對話)"]
```

**注意**：
- View 4 的 master 對話**會持久化**到 `MasterChatMessage`（一般 master 流程一致）。用戶最後在 dashboard 開啟 master widget 時，看到的是 funnel 期間 + 後續對話的連續歷史。
- View 3 的 Reading 行也是一般的 Reading 行，日後在 `/dashboard` 跟其他 reading 並列。

---

## 四、Schema 改動

[prisma/schema.prisma](../prisma/schema.prisma) 的 `User` 模型：

```prisma
model User {
  // ...existing fields
  password String?               // 由 String → String? (nullable for tentative)
  tentative           Boolean   @default(false)
  signupCompletedAt   DateTime?
  trialCreditsGranted Boolean   @default(false)
  funnelSource        Json?
  // ...
}
```

**Migration**：[prisma/migrations/20260426_funnel_tentative_users/](../prisma/migrations/20260426_funnel_tentative_users/migration.sql) 包含 ALTER + index `User_tentative_createdAt_idx`（cron 清理用）。

**4 個欄位的角色**：
- `tentative` — 是否半路用戶。`true` = 還沒設密碼，funnel 中。
- `signupCompletedAt` — 完成 funnel 的時間戳。`null` 對非 tentative 老用戶來說無意義（他們是走 /api/register）。
- `trialCreditsGranted` — 同 email 只給一次試用機緣的閘門。
- `funnelSource` — JSONB 存 utm_* + ip + 進場時間。歸因用。

**回溯相容性**：所有既有用戶 `tentative=false`、`trialCreditsGranted=false`、`signupCompletedAt=null` —— 行為完全不變。

---

## 五、Auth 雙軌

Funnel API 路由必須能識別兩種身份：
- **NextAuth session**：已完成註冊 + email 已驗證 + 已登入的用戶
- **Funnel cookie (`xj_funnel_session`)**：tentative 用戶，沒有 NextAuth session

### 5.1 Funnel cookie

**檔**：[src/lib/funnelSession.ts](../src/lib/funnelSession.ts)

格式：`<userId>.<expiresAtMs>.<HMAC-SHA256-base64url>`

簽章 key：`process.env.NEXTAUTH_SECRET`（複用既有 secret）。

特性：
- 24 小時 TTL（`FUNNEL_COOKIE_MAX_AGE_SEC`）
- httpOnly + sameSite=lax + secure (production)
- Constant-time 比較（防 timing attack）

### 5.2 雙軌 auth pattern（接入 funnel cookie 的兩個路由）

[src/app/api/divination/route.ts](../src/app/api/divination/route.ts) 跟 [src/app/api/master/route.ts](../src/app/api/master/route.ts) 都加了：

```ts
const session = await auth()
let userId: string | null = session?.user?.id ?? null
if (!userId) {
  const funnel = verifyFunnelToken(req.cookies.get(FUNNEL_COOKIE_NAME)?.value)
  if (funnel) userId = funnel.userId
}
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

之後路由內部全部用 `userId`（不再讀 `session.user.id`）。Tentative 用戶的所有 Reading / MasterChatMessage / 機緣扣款都正常走，因為 user 行已存在 (`tentative=true` 不影響 FK / queries)。

### 5.3 Null-password 防護

`User.password` 變 nullable，所以以下 4 個地方加了 `if (!user.password)` guard：
- [src/lib/auth.ts](../src/lib/auth.ts) — NextAuth credentials provider（return null）
- [src/app/api/auth/login/route.ts](../src/app/api/auth/login/route.ts) — 回傳 `TENTATIVE_USER` error code
- [src/app/api/profile/route.ts](../src/app/api/profile/route.ts) — 密碼變更（拒絕）
- [src/app/api/profile/delete/route.ts](../src/app/api/profile/delete/route.ts) — 帳號刪除（拒絕）

---

## 六、API 路由清單

### 6.1 Funnel 入口

| 路由 | 方法 | 目的 | 認證 |
|---|---|---|---|
| `/api/start/init` | POST | 創/重用 tentative + 建 Reading + 簽 cookie | rate-limit per IP（10/h） |
| `/api/start/complete` | POST | 設密碼 + 翻轉 tentative + 發驗證信 + 清 cookie | funnel cookie |

### 6.2 Funnel cookie 也可用的既有路由

| 路由 | 方法 | 認證 | Funnel 用途 |
|---|---|---|---|
| `/api/divination` | POST | NextAuth OR funnel cookie | View 3 流式排盤 |
| `/api/master` | POST | NextAuth OR funnel cookie | View 4 master demo |

### 6.3 Funnel 完全沒接入的路由

`/api/readings`、`/api/profile`、`/api/credits/*`、`/api/family-members/*` 等**都只接受 NextAuth session**。Funnel 用戶在完成 `/api/start/complete` + email 驗證 + login 之前是看不到 dashboard 的。

### 6.4 Admin

| 路由 | 方法 | 目的 |
|---|---|---|
| `/api/admin/funnel` | GET | 統計 + tentative 列表 |
| `/api/admin/funnel/cleanup` | POST | 批次刪除 tentative（可帶 `daysOld` override） |
| `/api/admin/funnel/[userId]` | DELETE | 單個刪 tentative（拒絕刪非 tentative） |

---

## 七、AdminSetting 鈕

| Key | 預設 | 控制 | 影響檔 |
|---|---|---|---|
| `trialCredits` | 10 | 每個新 tentative 用戶授予的機緣數量 | [/api/start/init](../src/app/api/start/init/route.ts) `resolveTrialCredits()` |
| `funnelCleanupDays` | 90 | 清理閾值（天） | [src/lib/funnelCleanup.ts](../src/lib/funnelCleanup.ts) `resolveCleanupDays()` |
| `registerBonus` | 6 | 完成註冊（funnel 或 /api/register）給予的機緣 | [/api/register](../src/app/api/register/route.ts) + [/api/start/complete](../src/app/api/start/complete/route.ts) |

調整建議：
- 流量很大但轉化低 → `trialCredits` ↓（試用更克制）
- 想拉高轉化 → `registerBonus` ↑
- DB 已堆積太多 tentative → `funnelCleanupDays` ↓ + 跑一次清理

---

## 八、運維 — Admin 介面

[/admin/funnel](../src/app/admin/funnel/page.tsx) 提供：
- **4 張統計卡**：tentative 總數 + d1/d7/d30、converted 總數 + d1/d7/d30、轉化率、可清除數
- **批次清理列**：填天數（空白用 AdminSetting cutoff），按鈕觸發 `POST /api/admin/funnel/cleanup`
- **Tentative 用戶表**：email · 年齡 · reading 計數 · UTM source · 單個刪除按鈕

依賴的純函數在 [src/lib/funnelCleanup.ts](../src/lib/funnelCleanup.ts)：
- `cleanupTentativeUsers(daysOld)` — 刪除 N 天前的 tentative（Reading 透過 FK CASCADE 一起刪）
- `getFunnelStats()` — 各時段計數 + 轉化率
- `listTentativeUsers(limit)` — 列表（含 readingCount）

### 8.1 自動化 cleanup（cron）

目前 cleanup 是**手動觸發**。要做成自動，兩條路徑：

**A. Vercel Cron**（如果部署在 Vercel）  
新增 `vercel.json`：
```json
{
  "crons": [{
    "path": "/api/admin/funnel/cleanup",
    "schedule": "0 3 * * *"
  }]
}
```
但 `/api/admin/funnel/cleanup` 目前要 admin session — Vercel cron 沒有 session。需要加一個 token-based bypass。

**B. 外部 scheduler（cron-job.org / EasyCron / GitHub Actions）**  
同樣需要在 `/api/admin/funnel/cleanup` 加一個 `Authorization: Bearer <CRON_TOKEN>` 接受路徑，token 從 env 讀。

**MVP 推薦**：先放著，每週手動跑一次。tentative 累積到困擾再做。

---

## 九、視覺風格 — 數位道場（Digital Sage）

### 9.1 共用元件

| 元件 | 檔 | 用途 |
|---|---|---|
| `<Starfield/>` | [src/components/start/Starfield.tsx](../src/components/start/Starfield.tsx) | 60 顆 deterministic-position 星辰，純 CSS twinkle，0 JS frame loop |
| `<TypewriterText/>` | [src/components/start/TypewriterText.tsx](../src/components/start/TypewriterText.tsx) | 字逐個揭露 + 終端風格底線游標 |
| `<StepIndicator/>` | [src/components/start/StepIndicator.tsx](../src/components/start/StepIndicator.tsx) | 5 點進度，從 pathname 推導當前步 |
| `<FunnelPageFade/>` | [src/components/start/FunnelPageFade.tsx](../src/components/start/FunnelPageFade.tsx) | AnimatePresence 包裹 children，180ms 淡入淡出 + y 微位移 |

### 9.2 共用 layout

[src/app/start/layout.tsx](../src/app/start/layout.tsx)：
```
<div min-h=100dvh overflow-hidden>
  <Starfield/>           ← z-0, pointer-events-none
  <div z-10 flex-col>
    <StepIndicator/>
    <FunnelPageFade>{children}</FunnelPageFade>
  </div>
</div>
```

### 9.3 各 view 的關鍵動效

| View | 動效 |
|---|---|
| 1 | hero 字逐個打出 → 副標 + CTA 接力淡入；CTA 後常駐 3.2s 金色呼吸光暈 |
| 2 | 每欄 80ms stagger 進場 |
| 3 | 四柱**墨滲式**：`clip-path: inset(0 0 100% 0) → inset(0 0 0% 0)` 從上往下 + drop-shadow glow 隨字穩定而散；柱與柱之間 180ms stagger，柱內天干 → 地支 100ms stagger；鎖住區塊持續橫掃 shimmer + 鎖頭 3s 呼吸 |
| 4 | 對話末尾**金色 ▍ 游標** blink；chip stagger + hover scale + 金光暈；3 賣點卡 stagger 揭露 |
| 5 | 卡背金色擴散光暈；CTA hover 增強光暈 |
| 5b | 📜 圖示 3.6s 呼吸放縮 |

### 9.4 關鍵設計選擇

- **沒引入新顏色**：全部走既有 `var(--gold)` + `var(--text-*)`。氛圍來自**動效節奏**而非新調色板。
- **動效全部 CSS keyframe + framer-motion**：CSS 跑大背景循環（starfield、shimmer、呼吸），framer-motion 跑一次性進場（stagger、ink-wipe）。避免主執行緒阻塞。
- **navbar 在 `/start*` 隱藏**：[Navbar.tsx](../src/components/Navbar.tsx) 用 `usePathname()?.startsWith('/start')` 判斷。沒有競爭 CTA。
- **MasterChatWidget 在 funnel 期間自動隱藏**：因為 tentative 用戶 `enabled = authenticated` 是 false。

---

## 十、UTM 歸因現狀

**已做的**：
1. View 1（`/start`）用 `useSearchParams` 抓 `utm_source/utm_medium/utm_campaign/utm_term/utm_content` 寫進 sessionStorage
2. View 2 提交時把 sessionStorage 取出傳給 `/api/start/init`
3. `/api/start/init` 寫入 `User.funnelSource: { ...utm, enteredAt, ip }`
4. `/admin/funnel` 表格 source 欄位顯示 `utm_source · utm_campaign · utm_medium`

**還沒做的（需要 user 提供 Pixel ID 才能加）**：
- Facebook Pixel（PageView + CompleteRegistration）
- Google Ads conversion tag
- TikTok Pixel

要加 Pixel：
1. 取得 Pixel ID（從廣告平台拿）
2. 在 [src/app/start/layout.tsx](../src/app/start/layout.tsx) 注入 `<Script>` 標籤（PageView 觸發）
3. 在 [/start/unlock/[id]](../src/app/start/unlock/[id]/page.tsx) 完成註冊後 fire `Purchase` / `CompleteRegistration` 事件

---

## 十一、測試

### 11.1 自動化整合測試

[tests/run_funnel_tests.sh](../tests/run_funnel_tests.sh) — 8 sections，~30 assertions，curl + cookie jar 風格（跟既有 [tests/run_tests.sh](../tests/run_tests.sh) 一致）。

```bash
# 預設 BASE_URL=http://localhost:8088
./tests/run_funnel_tests.sh

# 跑 staging
BASE_URL=https://staging.example.com ./tests/run_funnel_tests.sh
```

涵蓋：
1. View 1 / 2 頁面可達
2. `/api/start/init` happy path（201 + cookie + readingId + isReturning=false）
3. `/api/start/init` 驗證（bad email / shichen / gender → 400）
4. 同 email 二次提交（isReturning=true）
5. ALREADY_REGISTERED 短路（先建一個正常註冊用戶，funnel 拒絕）
6. `/api/divination` + `/api/master` cookie auth（無 cookie 401，有 cookie 200）
7. `/api/start/complete`（無 cookie 401，弱密碼 400，正確 200）
8. 完成後 funnel 不可重入

**LLM 成本**：測試用 `paipanOnly: true` 避免發 LLM 給 divination；master 用 `--max-time 3` 在認證確認後就斷流。

**測試殘留**：每次跑會留 2 行 User（1 funnel 完成、1 seed 註冊），跟 `run_tests.sh` 一樣不自動清。SQL truncate 即可。

### 11.2 單元測試

`vitest` 不直接覆蓋 funnel pages（純 UI），但既有 583/583 tests 都通過 funnel-相關的 schema 變動（user.password nullable + 4 新欄位）。

---

## 十二、未做事項（intentionally deferred）

- **真正的 stroke-by-stroke 書法動畫**：四柱用 SVG path stroke-dasharray + hanzi-writer 級的 stroke data，可比目前 clip-path 墨滲更接近書法感。約 4 小時（要評估 stroke data bundle 大小）。
- **Cron 自動清理**：見 §8.1。當 tentative 累積到 1k 量級可考慮。
- **Pixel 接入**：見 §10。需要 Pixel ID。
- **A/B 測試**：當前 funnel 是單一變體。若想 A/B 不同 hero 文案 / 不同 CTA / 不同 trial credits，需要：
  - `User.funnelVariant String?` 欄位
  - View 1 / View 2 從 query param 或 cookie 讀變體名
  - `/admin/funnel` 增加 variant 維度的轉化率
- **更多漏斗變種**：目前主打八字。若要 ziwei / iching 變種，最快路徑是在 `/api/start/init` 加 `type` 參數（預設 'bazi'）+ 對應的 view-specific copy。底層基礎設施（cookie、tentative user、Reading）都已通用化。
- **Mobile-specific 微調**：View 3 在小螢幕上四柱 grid 4 欄可能擠。已用 `text-lg` 而非 `text-xl`，可進一步降到 `text-base` 在 < 360px 視窗。

---

## 十三、檔案清單（全套漏斗）

### Schema + 共用

```
prisma/schema.prisma                            User 模型 + 4 新欄位
prisma/migrations/20260426_funnel_tentative_users/migration.sql
src/lib/funnelSession.ts                        cookie sign/verify
src/lib/funnelCleanup.ts                        清理 helper + stats
```

### API

```
src/app/api/start/init/route.ts                 POST 創 tentative + Reading + cookie
src/app/api/start/complete/route.ts             POST 完成註冊 + 發驗證信
src/app/api/admin/funnel/route.ts               GET stats + tentative 列表
src/app/api/admin/funnel/cleanup/route.ts       POST 批次清理
src/app/api/admin/funnel/[userId]/route.ts      DELETE 單個 tentative

src/app/api/divination/route.ts                 [改] 接受 funnel cookie auth + readingId-only 可省 inputData
src/app/api/master/route.ts                     [改] 接受 funnel cookie auth
src/lib/auth.ts                                 [改] null-password guard
src/app/api/auth/login/route.ts                 [改] null-password guard + TENTATIVE_USER error code
src/app/api/profile/route.ts                    [改] null-password guard
src/app/api/profile/delete/route.ts             [改] null-password guard
```

### 前端

```
src/app/start/layout.tsx                        共用 layout：starfield + step + page fade
src/app/start/page.tsx                          View 1 hook
src/app/start/cast/page.tsx                     View 2 form
src/app/start/reading/[id]/page.tsx             View 3 reading
src/app/start/master/[id]/page.tsx              View 4 master demo
src/app/start/unlock/[id]/page.tsx              View 5 unlock
src/app/start/verify-sent/page.tsx              View 5b post-signup splash
src/app/admin/funnel/page.tsx                   admin 控制台

src/components/start/Starfield.tsx
src/components/start/TypewriterText.tsx
src/components/start/StepIndicator.tsx
src/components/start/FunnelPageFade.tsx

src/components/Navbar.tsx                       [改] /start* 隱藏 navbar
src/app/dashboard/page.tsx                      [改] ?fromFunnel=1 自動展開 master widget
```

### 測試

```
tests/run_funnel_tests.sh                       8 sections, curl + cookie jar
```

---

## 十四、新 session 啟動建議第一句話

> 「我要加/改 /start 廣告漏斗的 [具體事項]。先讀 [docs/architecture/start-funnel.md](../architecture/start-funnel.md)，重點看 §三 資料流、§五 Auth 雙軌、§九 視覺，然後 grep 既有檔。改動 schema 記得跑 `npx prisma migrate deploy`，改完跑 `./tests/run_funnel_tests.sh`。」
