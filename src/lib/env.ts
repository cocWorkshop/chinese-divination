/**
 * Environment validation — fail fast at startup with NAMED variables instead
 * of confusing runtime errors deep in a request (e.g. a reset-email silently
 * built from a missing NEXTAUTH_URL).
 *
 * Imported from src/lib/prisma.ts, so it runs once per server process before
 * any route can touch the DB.
 *
 * Behavior by context:
 *   - `SKIP_ENV_VALIDATION=1`  → skipped entirely (Docker image build uses
 *     dummy values; this flag was already set in the Dockerfile).
 *   - `NODE_ENV=test`          → skipped (vitest runs without full secrets).
 *   - `NODE_ENV=production`    → THROWS on invalid/missing required vars.
 *   - otherwise (dev)          → logs a loud warning but does not throw, so
 *     local work without e.g. Stripe keys stays possible.
 */

import { z } from 'zod'

const reasoningEffort = z.enum(['low', 'medium', 'high', 'off']).optional()

const envSchema = z.object({
  // ── Required in production ────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'PostgreSQL connection string'),
  NEXTAUTH_SECRET: z.string().min(1, 'session JWT secret (openssl rand -base64 32)'),
  // Email links (verify / reset / claim) are built from this — request
  // headers are deliberately NOT trusted (host-header-injection guard).
  NEXTAUTH_URL: z.string().url('canonical site URL, e.g. https://chinese-divination.com'),
  OPENROUTER_API_KEY: z.string().min(1, 'LLM provider key'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),

  // ── Optional (validated when present) ─────────────────────────────────
  EMAIL_FROM: z.string().optional(),
  ALLOWED_EMAIL_ORIGINS: z.string().optional(), // comma-separated extra origins
  CLAUDE_PROXY_URL: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  TZ: z.string().optional(),

  // LLM model overrides (default: AdminSetting → hardcoded defaults)
  OPENROUTER_MODEL: z.string().optional(),
  MASTER_MODEL: z.string().optional(),
  PORTRAIT_MODEL: z.string().optional(),

  // Reasoning effort per endpoint
  LLM_REASONING_EFFORT: reasoningEffort,
  DIVINATION_REASONING_EFFORT: reasoningEffort,
  CHAT_REASONING_EFFORT: reasoningEffort,
  MASTER_REASONING_EFFORT: reasoningEffort,
  MASTER_BACKGROUND_REASONING_EFFORT: reasoningEffort,

  DIVINATION_JSON_MODE: z.enum(['off']).optional(), // any other value = leave JSON mode on
  MASTER_SESSION_STALE_HOURS: z.coerce.number().positive().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),

  // Sentry (optional — SDK no-ops while unset)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // OAuth Providers (optional)
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // '1' = log-retention job reports row counts without writing
  LOG_PURGE_DRY_RUN: z.enum(['1']).optional(),
})

export type Env = z.infer<typeof envSchema>

function validate(): void {
  if (process.env.SKIP_ENV_VALIDATION === '1' || process.env.NODE_ENV === 'test') return

  // Strip accidental surrounding quotes from env files (e.g. docker --env-file)
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
      process.env[k] = v.slice(1, -1)
    }
  }

  const result = envSchema.safeParse(process.env)
  if (result.success) return

  const lines = result.error.issues.map(
    (i) => `  - ${i.path.join('.')}: ${i.message}`
  )
  const message = `Environment validation failed:\n${lines.join('\n')}\n(see .env.example for documentation of every variable)`

  if (process.env.NODE_ENV === 'production') {
    // Fail fast: a prod process with broken config must not serve users.
    throw new Error(message)
  }
  console.warn(`⚠ ${message}`)
}

validate()
