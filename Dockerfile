FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV NEXT_PUBLIC_GA_ID=G-E4G738MBCX
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV STRIPE_SECRET_KEY="sk_dummy_build"
ENV STRIPE_WEBHOOK_SECRET="whsec_dummy_build"
ENV RESEND_API_KEY="re_dummy_build"
ENV NEXTAUTH_SECRET="dummy-build-secret"
RUN npm run build

# Isolated prisma CLI tree for the boot-time `migrate deploy`. Version is
# pinned to the lockfile's prisma (read from the deps stage); npm resolves the
# FULL transitive closure — the previous hand-picked COPY approach missed deep
# transitives (effect → fast-check → …) and crash-looped prod on 2026-06-12.
# Lives in its own directory so it can never collide with the app's runtime
# node_modules (standalone trace + generated client).
FROM node:20-alpine AS prisma-cli
WORKDIR /cli
COPY --from=deps /app/node_modules/prisma/package.json ./prisma-version.json
RUN npm install --no-save --no-audit --no-fund prisma@$(node -p "require('./prisma-version.json').version")

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/divination-refs ./divination-refs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Runtime migration tooling for start.js (`npx prisma migrate deploy`):
# copy the lockfile-resolved packages from the build stage instead of running
# an unpinned `npm install prisma @prisma/config effect --no-save` here —
# that fetched whatever was latest at image-build time, outside package-lock
# versioning. (@prisma/config ships inside the @prisma copy above; `effect`
# is its transitive dependency.)
# Boot-time migration tooling: the self-contained CLI tree from the
# prisma-cli stage (see comments there). start.js invokes it directly via
# `node prisma-cli/node_modules/prisma/build/index.js`.
COPY --from=prisma-cli /cli/node_modules ./prisma-cli/node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start.js ./start.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "start.js"]
