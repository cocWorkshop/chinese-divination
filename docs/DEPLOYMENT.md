# Deployment Guide — 玄機AI

Plain-language operator guide. Last updated 2026-06-12.

---

## 0. The one rule

> **Do not deploy a new image until the one-time PRE-DEPLOY GATE (§3) has been run.**
> The production database is schema-drifted; the container auto-runs migrations on
> start, and deploying before reconciling will record a failed migration that blocks
> all future ones. After the gate runs once, normal deploys (§4) are routine.

---

## 1. Before every deploy — quality gate (replaces CI while it's on hold)

```bash
npm run predeploy-check      # = type-check + lint + ALL tests (needs dev DB up)
# If the dev DB is unreachable:
npm run type-check && npm run lint && npm run test:unit
```
Deploy only on exit 0.

## 2. Environment file (`.env.production` on the server)

Required (the app REFUSES TO START in production if any is missing — it prints the
variable name in the logs): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
(must be `https://chinese-divination.com` — email links are built from it),
`OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.

Optional knobs are all documented in `.env.example`. Two worth knowing:
- `LOG_PURGE_DRY_RUN=1` — the daily log-retention job only *reports* what it would
  scrub/delete. **Recommended for the first day after deploying this version**; check
  the log line `log retention dry run`, then remove the flag.
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — see §6.

## 3. ONE-TIME pre-deploy gate (prod DB reconciliation + fail-fast start)

> **Owner decision 2026-06-12:** the deprecated `MasterSession.messages`/`portrait`
> columns are KEPT (re-declared in schema.prisma as deprecated, migration
> `restore_deprecated_mastersession_columns`). The reconciliation delta is therefore
> **fully additive — no statement destroys data** (the only `DROP`s are
> `DROP NOT NULL` constraint relaxations). The backup remains recommended as
> standard practice but is no longer guarding any destructive step.

Run together with me (the steps are interactive by agreement), or follow
`docs/prisma-migrations-recovery.md` §"One-time PROD reconciliation":

1. **Backup (on the server, recommended):**
   `pg_dump "postgresql://postgres:<pw>@localhost:5432/divination_db" > divination_db_backup_$(date +%Y%m%d).sql`
2. **Regenerate the delta** (now includes `LlmLog.requestId`, `Reading.creditsHeld`,
   `FamilyMember.relationDetail`, the funnel columns, and the 4 master-memory tables):
   `npx prisma migrate diff --from-url "<PROD_URL>" --to-schema-datamodel ./prisma/schema.prisma --script > prod_delta.sql`
3. **Review the SQL** (expect only ADD COLUMN / CREATE TABLE / CREATE INDEX /
   ADD CONSTRAINT / DROP NOT NULL — if any `DROP COLUMN` or `DROP TABLE` appears, STOP).
4. **Apply:** `DATABASE_URL="<PROD_URL>" npx prisma db execute --file ./prod_delta.sql --schema ./prisma/schema.prisma`
5. **Record migrations as applied** (bookkeeping only): for each migration that
   `DATABASE_URL="<PROD_URL>" npx prisma migrate status` lists as not applied:
   `DATABASE_URL="<PROD_URL>" npx prisma migrate resolve --applied <name>`
6. **Verify:** `migrate status` → "Database schema is up to date!"
7. Ship the `start.js` fail-fast change (task I2) in the same deploy.

## 4. Normal deploy (after the gate)

```bash
npm run predeploy-check                    # §1
git push                                   # docker-publish.yml builds + pushes the image
# on the server:
docker compose pull && docker compose up -d
docker ps                                  # container should reach "healthy" (healthcheck)
docker logs chinese-divination --tail 50   # JSON log lines; look for "job scheduler armed"
```

Rollback = `docker compose pull` a previous image tag and `up -d` (schema changes are
additive-only by policy; the migration history makes old code + new schema safe).

## 5. Reading the logs (since Phase 1)

Logs are JSON lines on stdout. Every request carries a `requestId`, which also lands
in the `LlmLog` DB row:

```bash
docker logs chinese-divination | grep '"requestId":"a1b2c3d4"'        # one request's whole life
docker logs chinese-divination | grep '"msg":"reading completed"'      # perf lines
docker logs chinese-divination | grep '"job":'                         # scheduled jobs
# pretty-print locally:  ... | npx pino-pretty
```

## 6. Sentry activation (currently wired but INERT)

What it is: a free error-tracking dashboard. When an exception happens in production
you get an alert + stack trace + the requestId, instead of grepping Docker logs.

To activate (one-time, ~10 minutes):
1. Create a free account at sentry.io → create a project (platform: Next.js).
2. Copy the **DSN** it shows (looks like `https://abc123@o456.ingest.sentry.io/789`).
3. Add to `.env.production`:
   `SENTRY_DSN="<dsn>"` and `NEXT_PUBLIC_SENTRY_DSN="<dsn>"` (same value).
4. The `NEXT_PUBLIC_` one is baked at **build** time → rebuild/republish the image, deploy.
5. Test: visit the site, trigger any error (or temporarily throw in a route) → it
   appears in the Sentry dashboard within seconds.

Until you do this, nothing is sent anywhere — the code no-ops.

## 7. CI (on hold — what it is and how to enable later)

CI = the §1 quality gate running automatically on GitHub's servers for every push,
*blocking* the image publish if anything fails — so an untested image can never reach
prod even by habit-slip. You opted to hold it; §1 is the manual substitute.

To enable later, create `.github/workflows/ci.yml`:

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
      - run: npx prisma migrate deploy        # also catches schema/migration drift
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:unit                # DB-bound integration tests need seeded data; start with unit
```

Then add `needs: check` (via `workflow_run` or a combined workflow) to
`docker-publish.yml` so publishing waits for green.

## 8. "Phase 3" items — plain-language explainer (nothing to do now)

These are *optional* improvements that only make sense when a specific trigger fires:

- **Durable rate limiting** (Postgres-backed): today, login/register attempt limits
  reset whenever the container restarts and can be dodged by header spoofing. The
  upgrade stores counters in Postgres. **Trigger:** you see brute-force patterns in
  the admin Auth Logs page — or never; it's defense-in-depth.
- **TanStack Query** (frontend data cache): today every page fetches its own data;
  navigating back refetches. The library dedupes and caches. **Trigger:** you notice
  stale-data bugs (e.g. credits not updating across components) — the new typed
  event bus may keep this unnecessary forever.
- **i18n framework**: the current `T(lang, 中文, English)` inline pattern is perfect
  for 2 languages. A framework (message catalogs, translator tooling) only pays off
  at language #3. **Trigger:** you commit to adding one.

If a trigger never fires, these are never built — that's by design, not neglect.
