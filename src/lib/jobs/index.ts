/**
 * In-process job scheduler — the single-container answer to "background work
 * doesn't belong in request handlers" (architecture plan I7/I9).
 *
 * Started exactly once per server process from src/instrumentation.ts
 * (Next's per-process startup hook). Deliberately tiny: setTimeout/setInterval
 * with unref()'d timers so a hanging job can't block process shutdown.
 *
 * Extensibility seam: jobs are plain async functions registered here. If the
 * deployment ever moves to host cron / an external scheduler, the job bodies
 * (e.g. logRetention.ts) move unchanged — only this registration file dies.
 */

import { logger } from '../logger'
import { runLogRetention } from './logRetention'

const DAY_MS = 24 * 60 * 60 * 1000
// First run shortly after boot (lets migrations/warmup settle), then daily.
const STARTUP_DELAY_MS = 5 * 60 * 1000

let started = false

interface JobDef {
  name: string
  run: () => Promise<void>
  intervalMs: number
}

const JOBS: JobDef[] = [
  { name: 'logRetention', run: runLogRetention, intervalMs: DAY_MS },
]

export function startJobs(): void {
  if (started) return
  started = true

  for (const job of JOBS) {
    const tick = async () => {
      const t0 = Date.now()
      logger.info({ job: job.name }, 'job started')
      await job.run() // jobs own their error handling; never throws
      logger.info({ job: job.name, durationMs: Date.now() - t0 }, 'job finished')
    }
    setTimeout(() => {
      void tick()
      setInterval(() => void tick(), job.intervalMs).unref()
    }, STARTUP_DELAY_MS).unref()
  }

  logger.info({ jobs: JOBS.map((j) => j.name), startupDelayMs: STARTUP_DELAY_MS }, 'job scheduler armed')
}
