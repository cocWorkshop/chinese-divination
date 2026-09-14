# Deployment Guide — 玄機AI

系統運維與生產部署操作手冊。最後更新：2026-09-12。

---

## 1. 部署前質量門禁 (Pre-deploy Quality Gate)

在發布任何新鏡像前，必須在本機執行門禁檢查：

```bash
npm run predeploy-check      # = type-check + lint + ALL tests (包含 integration 測試，需本機 dev DB)
```

若本地無法連接 dev 數據庫，可執行無庫單元測試門禁：
```bash
npm run type-check && npm run lint && npm run test:unit
```
**僅在退出碼為 0（全綠）時才允許部署。**

---

## 2. 生產環境變數配置 (`.env.production`)

生產伺服器必須配置以下環境變數（若缺少任一必填項，應用程式將在啟動時 **Fail-Fast** 拒絕啟動，並在日誌中輸出缺少的變數名）：

### 核心必填項
| 變數名 | 說明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 連接字串 (如 `postgresql://postgres:<pw>@localhost:5432/divination_db`) |
| `NEXTAUTH_SECRET` | NextAuth 會話加密私鑰 |
| `NEXTAUTH_URL` | 站點完整網址，必須為 `https://chinese-divination.com`（郵件驗證連結基於此生成） |
| `OPENROUTER_API_KEY` | OpenRouter LLM 接口金鑰 |
| `STRIPE_SECRET_KEY` | Stripe 支付私鑰 |
| `STRIPE_WEBHOOK_SECRET`| Stripe Webhook 簽名驗證金鑰 |
| `RESEND_API_KEY` | 郵件發送服務金鑰 |

### 常見可選配置
詳見 `.env.example`，重點參數：
- `LOG_PURGE_DRY_RUN=1` — 每日日誌清理任務僅報告不實際刪除（部署後首日建議開啟觀察，隨後移除）。
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — 異常監控上報（詳見第 5 節）。
- `LOG_LEVEL` — 日誌級別，默認 `info`，可選 `debug`。

---

## 3. 標準部署流程 (Normal Deploy)

數據庫已在 2026-06 統一完成基準調和，容器開機腳本 [`start.js`](../start.js) 會在啟動時自動安全執行 `npx prisma migrate deploy`。

日常部署流程如下：

```bash
# 1. 本地驗證並推送代碼
npm run predeploy-check
git push                     # 觸發 docker-publish.yml 構建並推送鏡像

# 2. 登入生產伺服器拉取並重啟
docker compose pull && docker compose up -d

# 3. 檢查容器狀態與健康度
docker ps                                  # 容器狀態應達到 "healthy"
docker logs chinese-divination --tail 50   # 檢查 JSON 日誌，確認看到 "job scheduler armed" 與開機正常
```

### 回滾策略 (Rollback)
若新鏡像發生問題，可直接在生產伺服器拉取上一版本標籤並重啟：
```bash
docker compose pull <previous_tag> && docker compose up -d
```
所有數據庫 Schema 變更均遵循向後兼容（Additive-only）原則，舊代碼可安全運行於新 Schema。

---

## 4. 日誌查詢與可觀測性 (Observability)

所有日誌均以結構化 JSON 輸出至 stdout。每個請求均攜帶唯一的 `requestId`，並自動記錄至數據庫 `LlmLog.requestId`：

```bash
# 追蹤某個請求的完整生命週期
docker logs chinese-divination | grep '"requestId":"a1b2c3d4"'

# 查詢解讀完成效能數據
docker logs chinese-divination | grep '"msg":"reading completed"'

# 查詢後台定時任務（日誌保留、過期解讀清理）執行狀態
docker logs chinese-divination | grep '"job":'

# 本地格式化查看
docker logs chinese-divination | npx pino-pretty
```

---

## 5. Sentry 異常監控

代碼庫已內置 Sentry（服務端 `instrumentation.ts` + 客戶端 `SentryClientInit.tsx`），預設在未配置 DSN 時完全靜默零開銷。

若要啟用：
1. 登入 sentry.io 創建 Next.js 專案並獲取 DSN。
2. 在伺服器 `.env.production` 中配置：
   ```env
   SENTRY_DSN="https://...@sentry.io/..."
   NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
   ```
3. 由於 `NEXT_PUBLIC_` 變數需在構建期打包，需重新構建/發布鏡像後部署。

---

## 6. 數據庫維護與歷史調和手冊

- **嚴禁 `prisma db push`**：開發與生產環境一律使用 `npx prisma migrate dev` / `npx prisma migrate deploy`，嚴禁使用 `db push` 破壞遷移歷史。
- **歷史漂移處理手冊**：若不幸遭遇遷移狀態異常或歷史漂移，請參閱歷史調和手冊：
  [`docs/archive/prisma-migrations-recovery-202606.md`](archive/prisma-migrations-recovery-202606.md)。

---

## 7. CI 自動化門禁（可選配置）

若未來希望將第 1 節的手動質量門禁完全移至 GitHub Actions，可新增 `.github/workflows/ci.yml`：

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: divination_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:test@localhost:5432/divination_test
      SKIP_ENV_VALIDATION: '1'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:unit
```

並在 `docker-publish.yml` 中設定依賴此 check 成功後再發布鏡像。
