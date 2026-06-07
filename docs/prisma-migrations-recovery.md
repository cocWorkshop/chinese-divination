# Prisma migrations — drift recovery & prod deploy runbook

_Last updated: 2026-06-07_

## TL;DR

For a long stretch this project evolved the schema with **`prisma db push`** instead of
`prisma migrate`, so the **migration history fell behind the real schema**. Dev has now been
reconciled with a catch-up migration. **Production is still drifted AND partial**, and because
prod auto-runs `prisma migrate deploy` on container start, **you must reconcile prod BEFORE (or as
part of) the next deploy** — otherwise the catch-up migration fails on prod and blocks all future
migrations.

---

## How deploys apply migrations (mechanics)

- Prod runs in Docker; `CMD ["node", "start.js"]`.
- [`start.js`](../start.js) runs **`npx prisma migrate deploy`** on every container start.
- It **catches and ignores** migration errors ("Don't exit — app can still run"). So a failed
  migration **won't crash the app**, but it **will**:
  - leave a **failed migration row** in `_prisma_migrations` that **blocks every future
    `migrate deploy`** until resolved, and
  - leave the schema changes **un-applied** (Prisma wraps each migration in a transaction → the
    whole migration rolls back on the first failing statement).
- `deploy.sh` just does `docker compose pull && up` — the migration runs inside the container.

---

## Current state (as of 2026-06-07)

### Dev DB — `divination_dev` @ 10.15.53.128 ✅ reconciled
- 29 historical migrations + **`20260607_catchup_baseline_drift`** (the catch-up) = 30, all applied.
- `prisma migrate status` → "up to date". `migrate dev` works normally again.
- The catch-up captured everything that had been `db push`'d: master-memory tables, wiki, gift
  links, credit ledger, Stripe fields, `MasterSession.tzOffsetMin`, plus index/FK/default changes.

### Prod DB — `divination_db` @ 10.15.53.128 ⚠️ partial / drifted
Read-only scan found prod is **neither baseline nor current**:
- `_prisma_migrations`: ~29 rows, newest **`20250330_add_device_token`**. Missing
  `20260426_funnel_tentative_users` and the catch-up.
- **Already has** (db-push'd to prod): `WikiArticle`, `GiftLink`, `GiftClaim`, `WelcomeRule`,
  `CreditLog`, `User.stripeCustomerId`, `Reading.status`.
- **Missing**: `MasterChatMessage`, `UserPortrait`, `UserPortraitHistory`, `AdminAccessLog`
  (the whole **master-memory system**) and `MasterSession.tzOffsetMin`.
- **Still has deprecated**: `MasterSession.messages`, `MasterSession.portrait`.

> Consequence: the Xuanji Master's memory / portrait / chat-history features are **non-functional in
> prod right now** — independent of the migration plumbing. The reconciliation below also fixes that.

Because prod already has the wiki/gift/stripe objects, running the catch-up migration as-is **fails**
(`CREATE TABLE WikiArticle … already exists`, `ADD COLUMN stripeCustomerId … already exists`).

---

## Deriving the prod connection string

`.env` has the **dev** URL. Prod is the same server, db name `divination_db`:

```
DEV  : postgresql://postgres:<pw>@10.15.53.128:5432/divination_dev
PROD : postgresql://postgres:<pw>@10.15.53.128:5432/divination_db
```

For any prisma command below that needs prod, prefix it with the prod URL (Prisma won't override an
already-set env var):

```bash
# bash
DATABASE_URL="postgresql://postgres:<pw>@10.15.53.128:5432/divination_db" npx prisma <cmd>
```
```powershell
# PowerShell
$env:DATABASE_URL="postgresql://postgres:<pw>@10.15.53.128:5432/divination_db"; npx prisma <cmd>
# (unset afterwards) Remove-Item Env:DATABASE_URL
```

---

## ⚠️ One-time PROD reconciliation — do this BEFORE deploying this version

### Step 0 — Back up prod first (non-negotiable; the sync drops 2 deprecated columns)
```bash
pg_dump "postgresql://postgres:<pw>@10.15.53.128:5432/divination_db" > divination_db_backup_$(date +%Y%m%d).sql
```

### Step 1 — See exactly what prod is missing (read-only, applies nothing)
```bash
npx prisma migrate diff \
  --from-url "postgresql://postgres:<pw>@10.15.53.128:5432/divination_db" \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > prod_delta.sql
cat prod_delta.sql
```
This `prod_delta.sql` is the **minimal, prod-specific** set of changes (create the 4 master-memory
tables, add `tzOffsetMin`, drop the 2 deprecated columns, a few indexes/FKs). Review it.

### Step 2 — Bring prod's schema up to date
Apply the reviewed delta to prod:
```bash
DATABASE_URL="<PROD_URL>" npx prisma db execute --file ./prod_delta.sql --schema ./prisma/schema.prisma
```
_Alternative (simpler, less surgical):_ `DATABASE_URL="<PROD_URL>" npx prisma db push` — it will
warn about dropping `MasterSession.messages` / `portrait`; confirm (those are deprecated, data was
migrated to the new tables).

### Step 3 — Reconcile prod's migration history (record, don't re-run)
Now prod's schema equals `schema.prisma`, but its `_prisma_migrations` is missing rows. Mark every
repo migration that prod hasn't recorded as **applied** (this only writes tracking rows; it does NOT
run SQL):
```bash
# list the repo migrations:
ls prisma/migrations | grep -v migration_lock
# compare against prod's recorded ones:
DATABASE_URL="<PROD_URL>" npx prisma migrate status
# for EACH migration shown as "not yet applied", run:
DATABASE_URL="<PROD_URL>" npx prisma migrate resolve --applied <migration_name>
# at minimum these two are missing on prod:
DATABASE_URL="<PROD_URL>" npx prisma migrate resolve --applied 20260426_funnel_tentative_users
DATABASE_URL="<PROD_URL>" npx prisma migrate resolve --applied 20260607_catchup_baseline_drift
```

### Step 4 — Verify
```bash
DATABASE_URL="<PROD_URL>" npx prisma migrate status   # → "Database schema is up to date!"
```

### Step 5 — Deploy normally
Now deploy the new image. `start.js` → `migrate deploy` finds nothing pending → clean. Master
features work because the tables now exist.

> If you skip Steps 1–4 and deploy anyway: the app still starts (start.js ignores the error), but the
> catch-up migration is recorded as **failed**, blocking all future migrations. To unstick:
> `DATABASE_URL="<PROD_URL>" npx prisma migrate resolve --rolled-back 20260607_catchup_baseline_drift`,
> then do Steps 1–4.

---

## Going forward — back to Prisma best practice

You're already most of the way back: **dev is reconciled** and `migrate deploy` is wired into
`start.js`. Keep it on the rails:

**DO**
- Change the schema only in `prisma/schema.prisma`, then **`npx prisma migrate dev --name <desc>`**
  — this creates a migration file. **Commit the migration folder with the code.**
- Let deploys apply them automatically via `migrate deploy` (already in `start.js`).
- Use a **separate database per environment** (dev / prod) — never point both at one DB.
- When you genuinely need to inspect/repair, `migrate diff` (read-only) and `migrate resolve`
  (bookkeeping) are the right tools.

**DON'T**
- ❌ Don't run **`prisma db push`** against any shared or prod database for routine schema changes —
  that's exactly what caused this drift (it changes the DB without recording a migration).
  `db push` is fine only for throwaway/local prototyping you don't deploy.
- ❌ Don't hand-edit the DB schema with raw SQL outside a migration.
- ❌ Don't delete or rename already-applied migration folders.

**Sanity check anytime:** `npx prisma migrate status` (dev) and `DATABASE_URL=<prod> npx prisma
migrate status` (prod) should both say "up to date". If `migrate dev` ever wants to **reset**, you've
drifted again — stop and investigate before confirming.
