# I13 — Container hygiene (Phase 0)

**Date:** 2026-06-12 · **Plan item:** I13

## What changed
- **`Dockerfile`:** removed the runtime-stage `RUN npm install prisma @prisma/config effect --no-save` (it fetched whatever was *latest* at every image build, outside package-lock versioning). The runner now COPYs the lockfile-resolved `node_modules/prisma`, `node_modules/effect`, and `node_modules/.bin/prisma` from the builder stage (`@prisma/config` was already included in the existing `@prisma` copy). These exist solely so `start.js` can run `npx prisma migrate deploy` at boot.
- **`docker-compose.yml`:** added `mem_limit: 2g` (a leak now degrades to a container restart instead of starving the host) and a `healthcheck` hitting `/api/config/nav` (cheap public GET) every 30s with `start_period: 90s` to cover boot-time migrations. `network_mode: host` unchanged.

## Operator instructions
- **Verification is deferred to the next image build** — Docker Desktop wasn't running on the dev machine. The next `docker build` / publish run verifies the COPY lines; if one fails the error names the missing path and the fix is mechanical. The copied paths were confirmed present in `node_modules` locally.
- After deploying, `docker ps` should show the container as `healthy` (not just `up`).
- If you ever bump major Prisma versions, the runner stage needs nothing extra — the copies track package-lock.json automatically.
