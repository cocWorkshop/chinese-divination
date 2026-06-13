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
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/effect ./node_modules/effect
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start.js ./start.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "start.js"]
