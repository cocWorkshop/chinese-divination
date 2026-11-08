# Deployment Guide — XuanJi AI

System operations and production deployment runbook. Last updated: 2026-09-12.

---

## 1. Pre-deploy Quality Gates

Before publishing or deploying any new Docker image, execute quality gate checks locally:

```bash
npm run predeploy-check      # = type-check + lint + ALL tests (includes integration tests; requires local dev DB)
```

If a local dev database is not connected, run the database-free quality gate:
```bash
npm run type-check && npm run lint && npm run test:unit
```
**Deployments are only permitted when the exit code is 0 (all green).**

---

## 2. Production Environment Configuration (`.env.production`)

The production server requires the following environment variables. If any mandatory variable is missing, the application **fails fast** on boot, exiting immediately and logging the missing variable names:

### Mandatory Core Variables
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgresql://postgres:<pw>@localhost:5432/divination_db`) |
| `NEXTAUTH_SECRET` | NextAuth session encryption secret key |
| `NEXTAUTH_URL` | Canonical site base URL, e.g. `https://chinese-divination.com` (used for email verification links) |
| `OPENROUTER_API_KEY` | OpenRouter LLM gateway API key |
| `STRIPE_SECRET_KEY` | Stripe payments secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification secret |
| `RESEND_API_KEY` | Resend email dispatch service API key |

### Optional Operational Variables
Refer to `.env.example` for comprehensive parameter listings:
- `LOG_PURGE_DRY_RUN=1` — Daily log retention job runs in dry-run mode without deleting rows (recommended during initial 24h deployment, then disable).
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — Sentry error monitoring reporting (see Section 5).
- `LOG_LEVEL` — Logging verbosity level (`info` by default, `debug` optional).

---

## 3. Standard Deployment Workflow

The database schema baseline was unified and reconciled in 2026-06. The container entrypoint script [`start.js`](../start.js) automatically executes `npx prisma migrate deploy` safely during container boot.

Standard production release procedure:

```bash
# 1. Validate quality gates locally and push to trigger automated CI/CD
npm run predeploy-check
git push                     # Triggers docker-publish.yml build and image publish

# 2. On production host, pull fresh image and restart containers
docker compose pull && docker compose up -d

# 3. Verify container status and health checks
docker ps                                  # Status must indicate "healthy"
docker logs chinese-divination --tail 50   # Inspect JSON logs; confirm "job scheduler armed" and clean startup
```

### Rollback Strategy
If an issue occurs with a newly deployed image, pull the prior release tag directly on the production host and restart:
```bash
docker compose pull <previous_tag> && docker compose up -d
```
All database schema migrations follow an additive-only backward-compatibility policy, ensuring previous application versions operate safely against updated database schemas.

---

## 4. Log Observability & Diagnostics

All logs are written to stdout formatted as structured JSON. Every request carries a unique `requestId`, automatically correlated in `LlmLog.requestId`:

```bash
# Trace entire lifecycle of a specific request
docker logs chinese-divination | grep '"requestId":"a1b2c3d4"'

# Query completed divination readings and latency metrics
docker logs chinese-divination | grep '"msg":"reading completed"'

# Query background cron jobs (log retention, expired reading sweepers)
docker logs chinese-divination | grep '"job":'

# Human-readable formatting in terminal
docker logs chinese-divination | npx pino-pretty
```

---

## 5. Sentry Error Monitoring

The codebase includes integrated Sentry monitoring (server-side `instrumentation.ts` + client-side `SentryClientInit.tsx`), operating with zero runtime overhead when no DSN is configured.

To enable Sentry:
1. Log into sentry.io, create a Next.js project, and copy the DSN.
2. In `.env.production` on the server, configure:
   ```env
   SENTRY_DSN="https://...@sentry.io/..."
   NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
   ```
3. Because `NEXT_PUBLIC_` variables are bundled during client compilation, rebuild and redeploy the Docker image.

---

## 6. Database Maintenance & Migration Runbook

- **Never use `prisma db push` in production**: Both development and production environments strictly use `npx prisma migrate dev` / `npx prisma migrate deploy` to maintain auditable schema version history.
- **Drift Resolution Runbook**: If migration anomalies or drift occur, consult the historical drift runbook:
  [`docs/archive/prisma-migrations-recovery-202606.md`](archive/prisma-migrations-recovery-202606.md).

---

## 7. CI Automation Quality Gate (Optional Configuration)

To run automated checks via GitHub Actions, configure `.github/workflows/ci.yml`:

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

Configure `docker-publish.yml` to require `CI` job success prior to building and publishing the Docker image.
