/**
 * Headless API smoke test for Phases 1-7.
 *
 * Uses the app's auth system directly (NextAuth credentials sign-in via
 * fetch), then tests each new endpoint. Reports pass/fail for each check.
 */

import { PrismaClient } from '@prisma/client'

const BASE = 'http://localhost:8088'
const EMAIL = 'zhangweicalm@gmail.com'
const PASSWORD = '123456789'

let sessionCookie = null

async function login() {
  // Get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const cookies = csrfRes.headers.getSetCookie?.() ?? []

  // Sign in
  const signInRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies.join('; '),
    },
    body: new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      json: 'true',
    }),
    redirect: 'manual',
  })

  // Collect all set-cookie headers
  const allCookies = [...cookies, ...(signInRes.headers.getSetCookie?.() ?? [])]
  sessionCookie = allCookies.join('; ')
  console.log(`Login: ${signInRes.status} (${allCookies.length} cookies)`)
  return signInRes.status < 400
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  return { status: res.status, data: await res.json().catch(() => null) }
}

async function apiStream(method, path, body) {
  const opts = {
    method,
    headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  // Drain the stream
  const reader = res.body?.getReader()
  if (reader) {
    while (true) {
      const { done } = await reader.read()
      if (done) break
    }
  }
  return { status: res.status }
}

const results = []
function check(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function run() {
  // ── Login ────────────────────────────────────────────────────────────
  const loginOk = await login()
  check('Login', loginOk)
  if (!loginOk) {
    console.error('Cannot proceed without login')
    process.exit(1)
  }

  // ── GET /api/master — Phase 5 fields ─────────────────────────────────
  const master = await api('GET', '/api/master')
  check('GET /api/master returns 200', master.status === 200)
  check('GET /api/master has hasReadings', master.data?.hasReadings !== undefined, `hasReadings=${master.data?.hasReadings}`)
  check('GET /api/master has disclosureSeen', master.data?.disclosureSeen !== undefined, `disclosureSeen=${master.data?.disclosureSeen}`)
  check('GET /api/master has portraitEnabled', master.data?.portraitEnabled !== undefined, `portraitEnabled=${master.data?.portraitEnabled}`)
  check('GET /api/master has readingTypeCounts', typeof master.data?.readingTypeCounts === 'object')
  check('GET /api/master messages is an array', Array.isArray(master.data?.messages), `length=${master.data?.messages?.length}`)

  // ── POST /api/master — Phase 3 reads + Phase 2 writes ────────────────
  const chat = await apiStream('POST', '/api/master', { message: 'API smoke test Phase 3' })
  check('POST /api/master returns 200', chat.status === 200)

  // Verify the row was written to MasterChatMessage
  const p = new PrismaClient()
  const rows = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int as c FROM "MasterChatMessage" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = $1)`,
    EMAIL,
  )
  check('MasterChatMessage has rows after POST', rows[0].c > 0, `count=${rows[0].c}`)

  // ── PATCH /api/master/disclosure-seen — Phase 5 ─────────────────────
  const disc = await api('PATCH', '/api/master/disclosure-seen')
  check('PATCH /api/master/disclosure-seen returns 200', disc.status === 200)

  // Verify user flag was set
  const userRow = await p.$queryRawUnsafe(
    `SELECT "masterMemoryDisclosureSeenAt" FROM "User" WHERE "email" = $1`,
    EMAIL,
  )
  check('masterMemoryDisclosureSeenAt is now set', userRow[0].masterMemoryDisclosureSeenAt != null)

  // ── POST /api/master/new-session — Phase 5 ──────────────────────────
  const newSess = await api('POST', '/api/master/new-session')
  check('POST /api/master/new-session returns 200', newSess.status === 200, `archived=${newSess.data?.archivedCount}`)

  // After new session, GET should return empty messages
  const afterReset = await api('GET', '/api/master')
  check('After new-session, messages array is empty', afterReset.data?.messages?.length === 0)

  // ── GET /api/profile/portrait — Phase 6 ──────────────────────────────
  const portrait = await api('GET', '/api/profile/portrait')
  check('GET /api/profile/portrait returns 200', portrait.status === 200)
  check('GET /api/profile/portrait has portrait key', 'portrait' in (portrait.data ?? {}))
  check('GET /api/profile/portrait has history key', 'history' in (portrait.data ?? {}))

  // ── PUT /api/profile/portrait — Phase 6 ──────────────────────────────
  const putPortrait = await api('PUT', '/api/profile/portrait', {
    topics: ['career', 'health'],
    preferences: { tone: 'direct', depth: 'concise' },
    lifeContext: 'API smoke test user',
    toneNotes: 'keep it brief',
  })
  check('PUT /api/profile/portrait returns 200', putPortrait.status === 200)
  check('PUT /api/profile/portrait saved', putPortrait.data?.saved === true || putPortrait.data?.reason === 'no_change')

  // Verify UserPortrait row exists
  const portraitRow = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int as c FROM "UserPortrait" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = $1)`,
    EMAIL,
  )
  check('UserPortrait row created after PUT', portraitRow[0].c > 0)

  // ── PATCH /api/profile/portrait/enabled — Phase 6 ────────────────────
  const toggleOff = await api('PATCH', '/api/profile/portrait/enabled', { enabled: false })
  check('PATCH /api/profile/portrait/enabled (off) returns 200', toggleOff.status === 200)
  const toggleOn = await api('PATCH', '/api/profile/portrait/enabled', { enabled: true })
  check('PATCH /api/profile/portrait/enabled (on) returns 200', toggleOn.status === 200)

  // ── GET /api/profile/export — Phase 6 GDPR ──────────────────────────
  const exportRes = await api('GET', '/api/profile/export')
  check('GET /api/profile/export returns 200', exportRes.status === 200)
  check('Export includes masterMemory', exportRes.data?.masterMemory !== undefined)
  check('Export masterMemory has chatMessages', Array.isArray(exportRes.data?.masterMemory?.chatMessages))
  check('Export masterMemory has portrait', 'portrait' in (exportRes.data?.masterMemory ?? {}))
  check('Export masterMemory has portraitHistory', Array.isArray(exportRes.data?.masterMemory?.portraitHistory))

  // ── DELETE /api/profile/portrait — Phase 6 ──────────────────────────
  const delPortrait = await api('DELETE', '/api/profile/portrait')
  check('DELETE /api/profile/portrait returns 200', delPortrait.status === 200)
  const afterDel = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int as c FROM "UserPortrait" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = $1)`,
    EMAIL,
  )
  check('UserPortrait row deleted after DELETE', afterDel[0].c === 0)

  // ── DELETE /api/master — Phase 5 "Forget everything" ─────────────────
  const forget = await api('DELETE', '/api/master')
  check('DELETE /api/master returns 200', forget.status === 200)
  const afterForget = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int as c FROM "MasterChatMessage" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = $1)`,
    EMAIL,
  )
  check('All MasterChatMessage rows deleted after DELETE', afterForget[0].c === 0)
  // Verify disclosureSeen was reset
  const userAfterForget = await p.$queryRawUnsafe(
    `SELECT "masterMemoryDisclosureSeenAt" FROM "User" WHERE "email" = $1`,
    EMAIL,
  )
  check('masterMemoryDisclosureSeenAt reset to null after DELETE', userAfterForget[0].masterMemoryDisclosureSeenAt == null)

  // ── Admin endpoint gating ────────────────────────────────────────────
  // The test user IS an admin — check the debug endpoint returns 200
  const userId = (await p.$queryRawUnsafe(`SELECT "id" FROM "User" WHERE "email" = $1`, EMAIL))[0].id
  const debugRes = await api('GET', `/api/admin/master-debug/${userId}`)
  check('GET /api/admin/master-debug/[userId] returns 200 for admin', debugRes.status === 200)
  check('Debug payload has target', debugRes.data?.target?.id === userId)
  check('Debug payload has chat stats', typeof debugRes.data?.chat?.stats?.total === 'number')
  check('Debug payload has livePreview', typeof debugRes.data?.livePreview?.systemPromptLength === 'number')
  check('Debug payload has accessLog', Array.isArray(debugRes.data?.accessLog))

  // Check AdminAccessLog was written
  const accessRows = await p.$queryRawUnsafe(
    `SELECT COUNT(*)::int as c FROM "AdminAccessLog" WHERE "targetUserId" = $1`,
    userId,
  )
  check('AdminAccessLog row created on debug view', accessRows[0].c > 0, `count=${accessRows[0].c}`)

  // ── Summary ──────────────────────────────────────────────────────────
  await p.$disconnect()
  console.log('\n' + '='.repeat(60))
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`${passed} passed, ${failed} failed out of ${results.length} checks`)
  if (failed > 0) {
    console.log('\nFailed checks:')
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ✗ ${r.name}`))
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('Smoke test crashed:', e)
  process.exit(1)
})
