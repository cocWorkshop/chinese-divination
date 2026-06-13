/**
 * Structured logging (pino → JSON lines on stdout).
 *
 * Docker captures stdout, so production logs become queryable
 * (`docker logs chinese-divination | jq 'select(.requestId=="…")'`)
 * instead of free-text console lines.
 *
 * Usage in routes:
 *   const log = createRequestLogger('divination')
 *   log.info({ type, userId }, 'reading started')
 *   …pass log.requestId into completeLLM/streamLLM so the LlmLog row
 *   carries the same id.
 *
 * Conventions:
 *   - message = stable, greppable phrase; variable data goes in the fields.
 *   - never log secrets or full prompts (LlmLog already stores previews).
 */

import pino from 'pino'
import { randomUUID } from 'crypto'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Keep pino's default fast JSON output. No transports/pretty-printing in
  // the server process — `npx pino-pretty` can be piped on locally if wanted.
  base: undefined, // drop pid/hostname noise (single container)
  timestamp: pino.stdTimeFunctions.isoTime,
})

export type RequestLogger = pino.Logger & { requestId: string }

/**
 * Child logger carrying a fresh requestId + endpoint on every line.
 * The same requestId should be passed to completeLLM/streamLLM (and from
 * there into the LlmLog DB row) so one id correlates stdout and DB logs.
 */
export function createRequestLogger(endpoint: string): RequestLogger {
  const requestId = randomUUID().slice(0, 8) // short id — log-friendly, collision-safe at this volume
  const child = logger.child({ requestId, endpoint }) as RequestLogger
  child.requestId = requestId
  return child
}
