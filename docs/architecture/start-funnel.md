# /start Advertising Funnel — Design, Implementation & Operations Manual

Written upon completion of Funnel v1. Documents **goals, 5-view structure, data flows, schema changes, dual-track auth, AdminSetting toggles, admin management views, visual styling, test suites, and deferred items** to provide immediate context for future sessions and serve as a baseline for extensions (A/B testing, additional funnel variants, conversion pixel integrations).

---

## 1. Goals & Design Principles

**Goal**: Seamlessly transition paid acquisition ad traffic from initial click to landing, value discovery, and account registration with minimal friction, leveraging the existing Karma credit model without introducing separate SKUs.

**Principles**:
1. **Value Before Registration**: Users view their computed natal chart before being asked to set a password. Anonymous users are identified via signed funnel cookies.
2. **Mandatory Email Verification**: Completing the funnel does not bypass email verification. An email verification link is required before login to prevent email account squandering or squatting.
3. **Controlled Trial Economics**: Each email receives a single grant of trial Karma credits (10 credits default, configurable via AdminSetting) without repeat grants.
4. **Non-blocking Funnel Retries**: Abandoned tentative accounts are cleaned up via a 90-day retention job or manual purge; repeat visits with the same email resume the session rather than granting duplicate trial credits.
5. **Visual Consistency**: The funnel adopts the "Digital Sage" aesthetic (deep space, subtle gold accents, progressive streaming animations), smoothly connecting with the core platform's metaphysical identity.

---

## 2. 5-View + 1-Splash Architecture

| # | Route | Purpose | Key UI Elements |
|---|---|---|---|
| 1 | `/start` | Hook | Typewriter hero headline, pulsing gold CTA button |
| 2 | `/start/cast` | Collect birth details & email | 4-field input form with staggered entrance animations |
| 3 | `/start/reading/[id]` | Streaming trial paipan | Four Pillars **ink-bleed** reveal, typewriter Overview and Career sections, 5 locked sections with shimmering overlays |
| 4 | `/start/master/[id]` | XuanJi Master demo | Automated check-in greeting, 3 quick-reply chips, typewriter streaming with terminal cursor, 3 core value propositions |
| 5 | `/start/unlock/[id]` | Password setup & conversion | Gold back-glow card, live password strength indicator |
| 5b | `/start/verify-sent` | "Check your email" confirmation | Animated breathing scroll icon, resend button |

**Conversion Goal**: Progression from View 1 click to View 5b registration. **Monetization** is not in this direct flow — the 50 welcome credits allow new users to explore their full chart and initial Master chats in the dashboard; subsequent readings use the standard `/subscribe` top-up flow.

**Progress Navigation**: Every view renders [`<StepIndicator>`](../src/components/start/StepIndicator.tsx) (5 dots, active step renders wider with a radiant gold fill).

---

## 3. End-to-End Data Flow & State Transitions

```mermaid
flowchart TD
    Ad["Ad Traffic (UTM Tracking)"] --> V1["View 1: /start<br/>(Write to sessionStorage xj_utm)"]
    V1 -->|Click CTA| V2["View 2: /start/cast<br/>(Collect Birth Date + Email)"]
    
    V2 -->|POST /api/start/init| InitRoute["/api/start/init Gateway<br/>• upsert User (tentative=true, credits=trialCredits)<br/>• create Reading (status=pending, type=bazi)<br/>• Set-Cookie: xj_funnel_session = HMAC(userId+exp)"]
    
    InitRoute -->|Return readingId| V3["View 3: /start/reading/[id]<br/>(Streaming Trial Paipan)"]
    V3 -->|POST /api/divination (Cookie Auth)| SSE1["SSE Stream:<br/>• chart_ready (Ink-bleed Four Pillars)<br/>• overview & career streaming text<br/>• 5 remaining sections locked with shimmer"]
    
    SSE1 -->|Click Next| V4["View 4: /start/master/[id]<br/>(Master Demo Chat)"]
    V4 -->|POST /api/master (Cookie Auth)| SSE2["Master Chat Stream:<br/>• Automated check-in greeting<br/>• 3 quick-prompt chips<br/>• Consumes trial credits (1/turn)"]
    
    SSE2 -->|Click Unlock All| V5["View 5: /start/unlock/[id]<br/>(Set Password & Convert)"]
    V5 -->|POST /api/start/complete| CompleteRoute["/api/start/complete Conversion<br/>• Transition User tentative to false<br/>• Atomically grant Welcome Credits (50)<br/>• Bind Reading ownership<br/>• Dispatch Resend verification email<br/>• Clear funnel cookie"]
    
    CompleteRoute -->|Navigate| V5b["View 5b: /start/verify-sent<br/>(Email Sent Splash)"]
    V5b -->|User clicks verification link| Verified["Verified -> /login -> /dashboard<br/>(Access complete reading & chat)"]
```

**Notes**:
- Master messages in View 4 **persist** to `MasterChatMessage` (identical to standard master sessions). When users open the Master widget in the dashboard post-conversion, they see their full continuous conversation history.
- The Reading row created in View 3 is a standard `Reading` record, appearing seamlessly on `/dashboard` alongside subsequent readings.

---

## 4. Schema Updates

[prisma/schema.prisma](../prisma/schema.prisma) `User` model updates:

```prisma
model User {
  // ...existing fields
  password String?               // Changed from String to String? (nullable for tentative users)
  tentative           Boolean   @default(false)
  signupCompletedAt   DateTime?
  trialCreditsGranted Boolean   @default(false)
  funnelSource        Json?
  // ...
}
```

**Migration**: [prisma/migrations/20260426_funnel_tentative_users/](../prisma/migrations/20260426_funnel_tentative_users/migration.sql) contains the ALTER statement and index `User_tentative_createdAt_idx` (for retention cleanup).

**Role of the 4 Fields**:
- `tentative` — Account status flag (`true` indicates user has not yet set a password and is progressing through the funnel).
- `signupCompletedAt` — Timestamp when funnel registration completed (`null` for standard users registering via `/api/register`).
- `trialCreditsGranted` — Gatekeeper ensuring an email receives trial credits at most once.
- `funnelSource` — JSONB field recording `utm_*`, client IP, and entry timestamp for marketing attribution.

**Backward Compatibility**: Existing registered users maintain `tentative=false`, `trialCreditsGranted=false`, `signupCompletedAt=null`, preserving all existing behaviors.

---

## 5. Dual-Track Authentication

Funnel API routes authenticate two distinct identities:
- **NextAuth Session**: Registered, verified, logged-in users.
- **Funnel Cookie (`xj_funnel_session`)**: Tentative users progressing through the funnel without a NextAuth session.

### 5.1 Funnel Cookie Specification

**File**: [src/lib/funnelSession.ts](../src/lib/funnelSession.ts)

Token format: `<userId>.<expiresAtMs>.<HMAC-SHA256-base64url>`

Signing key: `process.env.NEXTAUTH_SECRET` (reuses existing secret).

Characteristics:
- 24-hour TTL (`FUNNEL_COOKIE_MAX_AGE_SEC`)
- `httpOnly` + `sameSite=lax` + `secure` (production)
- Constant-time HMAC comparison (mitigating timing attacks)

### 5.2 Dual-Track Auth Pattern

[src/app/api/divination/route.ts](../src/app/api/divination/route.ts) and [src/app/api/master/route.ts](../src/app/api/master/route.ts) implement:

```ts
const session = await auth()
let userId: string | null = session?.user?.id ?? null
if (!userId) {
  const funnel = verifyFunnelToken(req.cookies.get(FUNNEL_COOKIE_NAME)?.value)
  if (funnel) userId = funnel.userId
}
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

Subsequent route logic references `userId` exclusively. Tentative user operations (Reading creation, Master chat messages, credit holds) execute normally against the existing `User` row.

### 5.3 Null-Password Security Guards

Because `User.password` is nullable, four security checkpoints enforce `if (!user.password)` guards:
- [src/lib/auth.ts](../src/lib/auth.ts) — NextAuth credentials provider (returns `null`).
- [src/app/api/auth/login/route.ts](../src/app/api/auth/login/route.ts) — Returns `TENTATIVE_USER` error code.
- [src/app/api/profile/route.ts](../src/app/api/profile/route.ts) — Password change attempts (rejected).
- [src/app/api/profile/delete/route.ts](../src/app/api/profile/delete/route.ts) — Account deletion attempts (rejected).

---

## 6. API Route Catalog

### 6.1 Funnel Specific Endpoints

| Route | Method | Purpose | Authentication |
|---|---|---|---|
| `/api/start/init` | POST | Upserts tentative user, creates Reading, signs cookie | Rate-limited per IP (10 req/hour) |
| `/api/start/complete` | POST | Sets password, completes registration, dispatches verification email, clears cookie | Funnel cookie |

### 6.2 Dual-Track Endpoints Supporting Funnel Cookies

| Route | Method | Authentication | Funnel Context |
|---|---|---|---|
| `/api/divination` | POST | NextAuth OR funnel cookie | View 3 streaming paipan |
| `/api/master` | POST | NextAuth OR funnel cookie | View 4 Master interactive demo |

### 6.3 NextAuth-Only Endpoints

`/api/readings`, `/api/profile`, `/api/credits/*`, `/api/family-members/*` **strictly require a NextAuth session**. Funnel users cannot access the user dashboard until completing `/api/start/complete`, verifying email, and authenticating via `/login`.

### 6.4 Admin Operations Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/funnel` | GET | Analytics metrics + tentative user listing |
| `/api/admin/funnel/cleanup` | POST | Batch deletes tentative records (accepts optional `daysOld` override) |
| `/api/admin/funnel/[userId]` | DELETE | Deletes single tentative record (rejects non-tentative accounts) |

---

## 7. AdminSetting Knobs

| Key | Default | Description | Impacted Files |
|---|---|---|---|
| `trialCredits` | 10 | Karma credits granted to new tentative users | [/api/start/init](../src/app/api/start/init/route.ts) `resolveTrialCredits()` |
| `funnelCleanupDays` | 90 | Inactive tentative account retention threshold (days) | [src/lib/funnelCleanup.ts](../src/lib/funnelCleanup.ts) `resolveCleanupDays()` |
| `registerBonus` | 6 | Welcome Karma credits granted upon registration | [/api/register](../src/app/api/register/route.ts) + [/api/start/complete](../src/app/api/start/complete/route.ts) |

---

## 8. Operations & Admin Management

The admin dashboard at [/admin/funnel](../src/app/admin/funnel/page.tsx) provides:
- **4 Metric Cards**: Total tentative accounts (d1/d7/d30), converted accounts (d1/d7/d30), conversion rate, purgeable account count.
- **Batch Cleanup Action**: Configurable retention day threshold triggering `POST /api/admin/funnel/cleanup`.
- **Tentative User Table**: Email, account age, associated reading count, UTM attribution, single-item deletion action.

Pure utility functions in [src/lib/funnelCleanup.ts](../src/lib/funnelCleanup.ts):
- `cleanupTentativeUsers(daysOld)` — Purges tentative accounts older than N days (cascade deletes associated Readings via foreign keys).
- `getFunnelStats()` — Calculates conversion rates and cohorts.
- `listTentativeUsers(limit)` — Paginated listing with reading counts.

### 8.1 Automated Cron Cleanup

Cleanup can be triggered manually or automated via:

**Option A: Vercel Cron** (if deployed on Vercel)  
In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/funnel/cleanup",
    "schedule": "0 3 * * *"
  }]
}
```
Requires bearer token authorization header verification.

**Option B: External Cron Scheduler (cron-job.org / GitHub Actions)**  
Requires configuring `Authorization: Bearer <CRON_TOKEN>` on `/api/admin/funnel/cleanup` reading from environment variables.

---

## 9. Visual Aesthetics — Digital Sage

### 9.1 Shared Components

| Component | File | Purpose |
|---|---|---|
| `<Starfield/>` | [src/components/start/Starfield.tsx](../src/components/start/Starfield.tsx) | 60 deterministic twinkling celestial points, pure CSS animation, 0 JS thread impact |
| `<TypewriterText/>` | [src/components/start/TypewriterText.tsx](../src/components/start/TypewriterText.tsx) | Progressive character reveal with terminal cursor |
| `<StepIndicator/>` | [src/components/start/StepIndicator.tsx](../src/components/start/StepIndicator.tsx) | 5-step progress bar dynamically bound to pathname |
| `<FunnelPageFade/>` | [src/components/start/FunnelPageFade.tsx](../src/components/start/FunnelPageFade.tsx) | AnimatePresence page transition wrapper with 180ms fade and micro y-offset |

### 9.2 Shared Layout

[src/app/start/layout.tsx](../src/app/start/layout.tsx):
```tsx
<div className="min-h-[100dvh] overflow-hidden">
  <Starfield />           {/* z-0, pointer-events-none */}
  <div className="z-10 flex flex-col">
    <StepIndicator />
    <FunnelPageFade>{children}</FunnelPageFade>
  </div>
</div>
```

### 9.3 Key View Transitions & Animations

| View | Animation |
|---|---|
| 1 | Hero text typewriter reveal -> Subhead & CTA fade-in; persistent 3.2s gold breathing glow on CTA |
| 2 | 80ms staggered input field entrances |
| 3 | Four Pillars **ink-bleed effect**: `clip-path: inset(0 0 100% 0) -> inset(0 0 0% 0)` reveal; 180ms pillar stagger, 100ms stem-to-branch stagger; locked sections display continuous diagonal shimmer |
| 4 | Blinking gold cursor at chat end; chip stagger with hover scale; 3 value proposition cards reveal in sequence |
| 5 | Card back gold diffuse glow; interactive button hover state |
| 5b | Animated scroll icon with 3.6s breathing animation |

### 9.4 Design Tokens & Layout Rules

- **Zero Ad-Hoc Palettes**: Adheres strictly to `var(--gold)` and `var(--text-*)`. Tone is shaped by motion cadence rather than custom colors.
- **Hardware-Accelerated Motion**: CSS keyframes manage continuous ambient loops (starfield, shimmer, breathing); Framer Motion handles one-off entry transitions.
- **Navbar Hidden in Funnel**: [Navbar.tsx](../src/components/Navbar.tsx) checks `usePathname()?.startsWith('/start')` to prevent distractions.
- **MasterChatWidget Suppressed**: Unauthenticated tentative users do not render the global floating widget.

---

## 10. Marketing UTM Attribution

**Implemented**:
1. View 1 (`/start`) extracts `utm_source/utm_medium/utm_campaign/utm_term/utm_content` via `useSearchParams` and persists to `sessionStorage`.
2. View 2 includes stored attribution when calling `/api/start/init`.
3. `/api/start/init` persists data into `User.funnelSource: { ...utm, enteredAt, ip }`.
4. `/admin/funnel` displays source attribution (`utm_source · utm_campaign · utm_medium`).

**External Pixel Tracking Integration Steps**:
1. Acquire Pixel ID from ad platform (Facebook, Google Ads, TikTok).
2. Inject `<Script>` tags into [src/app/start/layout.tsx](../src/app/start/layout.tsx) for PageView tracking.
3. Emit `Purchase` or `CompleteRegistration` conversion events upon completion in [/start/unlock/[id]](../src/app/start/unlock/[id]/page.tsx).

---

## 11. Automated Testing

### 11.1 Integration Test Suite

[tests/run_funnel_tests.sh](../tests/run_funnel_tests.sh) — 8 sections, ~30 assertions using curl + cookie jar:

```bash
# Default BASE_URL=http://localhost:8088
./tests/run_funnel_tests.sh

# Run against staging
BASE_URL=https://staging.example.com ./tests/run_funnel_tests.sh
```

Coverage:
1. View 1 and View 2 reachability.
2. `/api/start/init` happy path (201 status + cookie + readingId + `isReturning=false`).
3. `/api/start/init` input validation (invalid email / shichen / gender returns 400).
4. Duplicate email handling (`isReturning=true`).
5. `ALREADY_REGISTERED` shortcut (existing registered users rejected from funnel).
6. `/api/divination` and `/api/master` funnel cookie authentication (401 without cookie, 200 with cookie).
7. `/api/start/complete` (401 without cookie, 400 on weak password, 200 on success).
8. Funnel non-reentrancy post-completion.

### 11.2 Unit Tests

Vitest test suites run across all core calculation logic, validating schema updates (nullable `user.password` and new tracking attributes).

---

## 12. Intentionally Deferred Items

- **Stroke-by-Stroke Calligraphy Animation**: SVG path `stroke-dasharray` rendering using character stroke data to enhance ink-bleed effects (est. 4 hours; requires stroke bundle sizing assessment).
- **Automated Cron Scheduling**: See Section 8.1. Implement when tentative accounts exceed 1,000 records.
- **Pixel Tracking**: See Section 10. Awaiting tracking IDs.
- **A/B Testing Variants**: Requires `User.funnelVariant String?` schema field, variant query parameters, and variant breakdown metrics in `/admin/funnel`.
- **Additional Funnel Typologies**: Expand beyond BaZi into Zi Wei or I Ching by passing a `type` parameter to `/api/start/init`.
- **Ultra-Small Screen Typography Tuning**: View 3 4-column layout optimization for viewports under 360px.

---

## 13. File Manifest

### Schema & Shared Infrastructure
```
prisma/schema.prisma                            User model with 4 funnel fields
prisma/migrations/20260426_funnel_tentative_users/migration.sql
src/lib/funnelSession.ts                        Cookie signing and validation
src/lib/funnelCleanup.ts                        Cleanup utilities and metrics
```

### API Routes
```
src/app/api/start/init/route.ts                 POST: Upserts tentative user + Reading + cookie
src/app/api/start/complete/route.ts             POST: Sets password, dispatches verification email
src/app/api/admin/funnel/route.ts               GET: Analytics metrics + tentative user list
src/app/api/admin/funnel/cleanup/route.ts       POST: Batch retention cleanup
src/app/api/admin/funnel/[userId]/route.ts      DELETE: Single tentative user deletion

src/app/api/divination/route.ts                 Accepts funnel cookie auth
src/app/api/master/route.ts                     Accepts funnel cookie auth
src/lib/auth.ts                                 Null-password guard
src/app/api/auth/login/route.ts                 Null-password guard + TENTATIVE_USER error code
src/app/api/profile/route.ts                    Null-password guard
src/app/api/profile/delete/route.ts             Null-password guard
```

### Frontend Views & Components
```
src/app/start/layout.tsx                        Shared funnel layout: Starfield + Step + Fade
src/app/start/page.tsx                          View 1: Hook
src/app/start/cast/page.tsx                     View 2: Form
src/app/start/reading/[id]/page.tsx             View 3: Reading
src/app/start/master/[id]/page.tsx              View 4: Master interactive demo
src/app/start/unlock/[id]/page.tsx              View 5: Unlock & convert
src/app/start/verify-sent/page.tsx              View 5b: Post-signup confirmation splash
src/app/admin/funnel/page.tsx                   Admin management console

src/components/start/Starfield.tsx
src/components/start/TypewriterText.tsx
src/components/start/StepIndicator.tsx
src/components/start/FunnelPageFade.tsx

src/components/Navbar.tsx                       Suppresses navbar on /start* routes
src/app/dashboard/page.tsx                      Supports ?fromFunnel=1 auto-expansion
```

### Test Suites
```
tests/run_funnel_tests.sh                       8-section integration suite with curl + cookie jar
```
