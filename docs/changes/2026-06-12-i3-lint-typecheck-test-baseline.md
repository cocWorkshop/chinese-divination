# I3 — Lint / typecheck / test baseline (Phase 0)

**Date:** 2026-06-12 · **Plan item:** I3 (architecture plan Phase 0)

## What changed
- **`.eslintrc.json` (new):** extends `next/core-web-vitals`, registers the `@typescript-eslint` plugin (needed by existing `eslint-disable` comments), `react-hooks/exhaustive-deps` kept at `warn`.
- **`package.json` devDependencies:** added `eslint@^8.57.0`, `eslint-config-next@^14.2.35` (they were never installed — `npm run lint` used to open an interactive setup prompt and do nothing).
- **`package.json` scripts (new):**
  - `type-check` — `tsc --noEmit`
  - `test` — `vitest` (watch) · `test:ci` — `vitest run` (full, includes DB-bound integration tests) · `test:unit` — full run **excluding** `src/__tests__/integration/**` (works without the dev DB)
  - `predeploy-check` — `type-check` + `lint` + `test:ci` in sequence
  - `db:push` now prints a drift warning referencing `docs/prisma-migrations-recovery.md` before running.
- **Lint fixes:** replaced ASCII `"` with typographic “” in CJK copy (`(divination)/bazi/page.tsx`, `(divination)/qimen/page.tsx`, `admin/users/[id]/master/page.tsx`) — fixes `react/no-unescaped-entities` and is correct CJK typography.

## Operator instructions (IMPORTANT — replaces CI while I4 is on hold)
**Before every deploy, run:**
```bash
npm run predeploy-check        # type-check + lint + full tests (needs dev DB up)
# or, when the dev DB is unreachable:
npm run type-check && npm run lint && npm run test:unit
```
Deploy only on exit 0.

## Known remaining warnings (deliberate)
5 `react-hooks/exhaustive-deps` warnings (admin/feedback, useDivinationInit, MasterChatContext ×2, MysticalLoader). These effects are deliberately tuned; mechanical dep additions would change behavior. They'll be addressed properly during I14 (MasterChatContext decomposition) or when those files are next touched.

## Verification done
`npm run lint` exit 0 (5 warnings) · `npm run type-check` exit 0 · `npm run test:unit` 983/983 passed.
