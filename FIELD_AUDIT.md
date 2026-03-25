# Field Usage Audit

Generated: 2026-03-24

---

## 1. User Model

| Field | Used? | Issues |
|-------|-------|--------|
| `id` | ✅ Widely used | None |
| `email` | ✅ Auth, admin, display | None |
| `password` | ✅ Auth (hashed) | None |
| `name` | ✅ Profile, display | None |
| `language` | ✅ i18n throughout | None |
| `birthDate` | ✅ Profile + divination | None |
| `birthTime` | ✅ Profile + divination | None |
| `birthPlace` | ✅ Profile + divination | None |
| `gender` | ✅ Profile + divination | None |
| `timeMode` | ✅ Profile + divination | ⚠️ **VALUE MISMATCH** — see §6 |
| `exactTime` | ✅ Profile + divination | None |
| `calendarType` | ✅ Profile + divination | ⚠️ **NAME MISMATCH** — see §6 |
| `birthEnvironment` | ✅ Profile + divination + LLM prompt | None — used correctly as geographic/environmental context (rural, urban, mountainous) |
| `birthLat` | ✅ Profile + divination (true solar time) | None |
| `birthLng` | ✅ Profile + divination (true solar time) | None |
| `isAdmin` | ✅ Used for all access control | ⚠️ Redundant with `role` — see below |
| `isPaid` | ⚠️ Admin panel only | Effectively dead for app logic; only displayed/toggled in admin user management. No business logic reads it. |
| `role` | ⚠️ Barely used | Only written in admin user update. Never read for access control (isAdmin is used instead). **Redundant.** |
| `divinationCredits` | ✅ Rate limiting + display | None |
| `chatCredits` | ✅ Rate limiting + display | None |
| `lastDailyBonus` | ✅ Daily bonus logic | None |
| `emailVerified` | ✅ Auth flow | None |
| `verificationToken` | ✅ Email verification | None |
| `tokenExpiry` | ✅ Token expiration checks | None |
| `resetToken` | ✅ Password reset | None |
| `resetTokenExpiry` | ✅ Password reset | None |
| `deleteToken` | ✅ Account deletion | None |
| `deleteTokenExpiry` | ✅ Account deletion | None |
| `stripeCustomerId` | ✅ Stripe integration | None |
| `stripeSubscriptionId` | ❌ **DEAD FIELD** | Exists in schema, zero references in code |
| `subscriptionStatus` | ❌ **DEAD FIELD** | Exists in schema, zero references in code |
| `chatSummary` | ❌ **DEAD FIELD** | Written by `updateChatSummary()` which is **never called**. The function itself is dead code. Field is written but never read. |
| `hourlyQuota` | ❌ **DEAD FIELD** | Exists in schema, zero references in code |
| `bonusModel1` | ✅ Compensation system | None |
| `bonusModel2` | ✅ Compensation system | None |
| `bonusChat` | ✅ Compensation + share bonus | None |
| `consentAt` | ✅ Privacy consent | None |
| `consentVersion` | ✅ Privacy consent | None |
| `createdAt` | ✅ | None |
| `updatedAt` | ✅ Auto | None |

---

## 2. FamilyMember Model

| Field | Used? | Issues |
|-------|-------|--------|
| `id` | ✅ | None |
| `userId` | ✅ | None |
| `relation` | ✅ | None |
| `name` | ✅ | None |
| `birthDate` | ✅ | None |
| `birthTime` | ✅ | None |
| `birthPlace` | ✅ | None |
| `gender` | ✅ | None |
| `calendarType` | ✅ | Same naming mismatch as User — stored as `calendarType`, form sends as `calendarType` in profile, as `lunarToggle` in divination |
| `timeMode` | ✅ | Same value mismatch as User — profile uses `'exact'`, divination form uses `'precise'` |
| `exactTime` | ✅ | None |
| `birthLat` | ✅ | None |
| `birthLng` | ✅ | None |
| `birthEnvironment` | ✅ | None |
| `createdAt` | ✅ | None |
| `updatedAt` | ✅ | None |

All FamilyMember fields are properly CRUD'd via `/api/family-members` and displayed in profile. No orphaned fields.

---

## 3. Reading Model

| Field | Used? | Issues |
|-------|-------|--------|
| `id` | ✅ | None |
| `userId` | ✅ | None |
| `type` | ✅ | None |
| `modelTier` | ✅ | None |
| `question` | ✅ | None |
| `inputData` | ✅ | JSON — stores all form data |
| `result` | ✅ | Stores final merged LLM result (JSON string) |
| `language` | ✅ | None |
| `targetType` | ✅ | `"self"` or `"family"` |
| `familyMemberId` | ✅ | None |
| `status` | ✅ | `"pending"` / `"completed"` / `"failed"` — set correctly |
| `calculationData` | ✅ | Raw calculation JSON (BaZi pillars, Ziwei chart, etc.) |
| `llmPrompt` | ✅ | Full system+user prompt saved |
| `llmRawOutput` | ✅ | Raw LLM response before merge |
| `chatMessages` | ✅ | JSON text array of `{role, content}` — consistently used as JSON string, parsed with `JSON.parse()`, capped at message limit |
| `rating` | ✅ | Denormalized from ReadingFeedback |
| `shareToken` | ✅ | Sharing system |
| `deletedAt` | ✅ | Soft delete |
| `createdAt` | ✅ | None |

No issues with Reading fields. All used correctly.

---

## 4. AdminSetting Keys

Keys found in code:

| Key | Where Used | Purpose |
|-----|-----------|---------|
| `dailyBonusDivination` | `rateLimit.ts` | Daily free divination credits |
| `dailyBonusChat` | `rateLimit.ts` | Daily free chat credits |
| `llmTimeoutSeconds` | `init`, `credits`, `chat`, `divination` routes | LLM request timeout |
| `shareBonus` | `share/bonus`, `share/claim`, `register` | Divination credits for sharing |
| `shareBonusChat` | `share/bonus`, `share/claim`, `register` | Chat credits for sharing |
| `chatModelName` | `chat/route.ts` | Override chat model |
| `model1Name` | `chat/route.ts` | Fallback model name |
| `chatMaxTurns` | `chat/route.ts` | Max chat turns |
| `divinationVisibility_*` | `divination/visibility` | Per-type visibility toggle |
| Various tier settings | `divination-tiers`, `divination/init` | Model tier config |

All keys are used correctly and consistently. Read via `findUnique`/`findMany`, written via admin settings page.

---

## 5. Form Field Names vs Backend Field Names

### Divination Form (`src/app/divination/[type]/page.tsx`) → Backend (`src/app/api/divination/route.ts`)

| Form Field | Backend reads as | Match? |
|-----------|-----------------|--------|
| `birthDate` | `inputData.birthDate` | ✅ |
| `birthTime` | `inputData.birthTime` | ✅ |
| `birthPlace` | `inputData.birthPlace` | ✅ |
| `gender` | `inputData.gender` | ✅ |
| `question` | `inputData.question` (from body, not inputData) | ✅ |
| `lunarToggle` | `inputData.lunarToggle` | ✅ — but see §6 |
| `timeMode` | `inputData.timeMode` | ⚠️ VALUES DIFFER — see §6 |
| `exactTime` | `inputData.exactTime` | ✅ |
| `birthEnvironment` | `inputData.birthEnvironment` | ✅ |
| `birthLat` | `inputData.birthLat` | ✅ |
| `birthLng` | `inputData.birthLng` | ✅ |
| `readingDateTime` | `inputData.readingDateTime` | ✅ (meihua only) |
| `liuyaoLines` | `inputData.liuyaoLines` | ✅ |
| `subType` | Not read by backend | ⚠️ Sent but unused in backend |
| `hexagram` | Not read by backend | ⚠️ Sent but unused |
| `direction` | Not read by backend | ⚠️ Sent but unused |
| `yearBuilt` | Not read by backend | ⚠️ Sent but unused |
| `ownerInfo` | Not read by backend | ⚠️ Sent but unused |
| (none) | `inputData.dateTime` (qimen) | ⚠️ Backend reads `dateTime` but form never sends it (falls back to `clientDate`) |

---

## 6. Deep-Check: Specific Fields

### `birthEnvironment`
- **UI label:** "例：農村、城市、山區..." / "e.g. rural, urban, mountainous..."
- **Schema comment:** "daylight saving, etc." ← **MISLEADING COMMENT**
- **Actual usage:** Geographic/environmental context for birth location, passed to LLM prompt as "出生地环境"
- **Issue:** Schema comment says "daylight saving" but it's actually used for geographic environment (rural/urban/mountain). The UI and backend usage are consistent with each other, but the schema comment is wrong.
- **Fix:** Update schema comment to `// geographic environment (rural, urban, mountainous, etc.)`

### `birthTime` vs `exactTime`
- **`birthTime`**: Traditional Chinese shichen (時辰) — fuzzy 2-hour period (e.g., "子时", "丑时")
- **`exactTime`**: Precise HH:MM format for true solar time calculation
- **Usage:** Never confused in code. Backend correctly checks `timeMode` to decide which to use.
- **Issue:** None — clean separation.

### `timeMode` — "fuzzy" vs "precise" vs "exact"
- **Schema comment:** `"fuzzy" | "exact"`
- **Profile page (`profile/page.tsx`):** Uses `'fuzzy' | 'exact'`
- **Divination form (`divination/[type]/page.tsx`):** Uses `'fuzzy' | 'precise'`
- **Backend (`divination/route.ts`):** Checks `=== 'precise'`
- **⚠️ BUG:** Profile page saves `timeMode: 'exact'` to the database. When this user goes to divination, their profile is loaded and `timeMode` becomes `'exact'`. The backend checks `=== 'precise'` and **will not recognize `'exact'`**, falling through to fuzzy mode. Users who set "precise" mode in their profile will silently get fuzzy behavior in divination.
- **Fix:** Standardize on one value. Either change profile to use `'precise'` or change backend to check both `'precise'` and `'exact'`.

### `calendarType` vs `lunarToggle`
- **Database field:** `calendarType` (on User and FamilyMember)
- **Profile page:** Uses `calendarType` directly ✅
- **Divination form:** Uses `lunarToggle` as the form field name
- **Backend:** Reads `inputData.lunarToggle`, saves to DB as `calendarType` (line 280: `calendarType: inputData.lunarToggle || null`, line 1144: `profileUpdate.calendarType = inputData.lunarToggle`)
- **Loading from profile:** Maps correctly: `lunarToggle: p.calendarType || 'solar'` (line 170)
- **Issue:** Two names for the same concept. Not a bug (mapping is correct), but confusing for maintainability.
- **Fix:** Consider renaming form field from `lunarToggle` to `calendarType` for consistency.

### `readingDateTime`
- **Used for:** Meihua (梅花易数) divination only
- **Form:** Always present in form state (initialized to current datetime)
- **Backend:** Only read for `type === 'meihua'` (line 538)
- **Issue:** None — it's correctly type-gated. Sent for all types but only consumed for meihua. Harmless.

### `chatMessages` (Reading field)
- **Storage:** `String? @db.Text` — always JSON string
- **Write:** `JSON.stringify(capped)` in `/api/readings/[id]/chat/route.ts`
- **Read:** `JSON.parse(reading.chatMessages)` in chat route and public reading route
- **Display:** Parsed and passed as typed array to result components
- **Issue:** None — consistently JSON text.

### `chatSummary` (User field)
- **Written by:** `updateChatSummary()` function in `chat/route.ts`
- **But:** `updateChatSummary()` is **never called** — dead function
- **Read by:** Nothing
- **Issue:** **DEAD FIELD + DEAD CODE.** The function exists but is never invoked. `chatSummary` is never populated or read.
- **Fix:** Remove `updateChatSummary()` function and `chatSummary` field from schema.

### `birthLat` / `birthLng`
- **Profile page:** CRUD in profile and family member forms ✅
- **Divination form:** Populated via geocoding when birthPlace is entered ✅
- **Backend:** Used for true solar time calculation in BaZi (`inputData.birthLng`) ✅
- **Saved to profile:** `if (inputData.birthLat != null) profileUpdate.birthLat = inputData.birthLat` ✅
- **Issue:** None — consistently used.

---

## 7. Orphaned / Dead Fields

| Field | Model | Status |
|-------|-------|--------|
| `hourlyQuota` | User | ❌ **DEAD** — zero references in code |
| `stripeSubscriptionId` | User | ❌ **DEAD** — zero references in code |
| `subscriptionStatus` | User | ❌ **DEAD** — zero references in code |
| `chatSummary` | User | ❌ **DEAD** — written by dead function, never read |
| `isPaid` | User | ⚠️ **Nearly dead** — only displayed/toggled in admin panel, no business logic |
| `role` | User | ⚠️ **Redundant** — only written in admin update, never read for access control (`isAdmin` is used everywhere) |

---

## Summary of Issues

### 🔴 Bugs
1. **`timeMode` value mismatch** — Profile saves `'exact'`, divination backend expects `'precise'`. Users who set time mode via profile will silently get wrong behavior in divination.

### 🟡 Dead Fields (safe to remove)
2. `hourlyQuota` — zero usage
3. `stripeSubscriptionId` — zero usage
4. `subscriptionStatus` — zero usage
5. `chatSummary` + `updateChatSummary()` — dead code, never called/read

### 🟡 Redundancy
6. `isAdmin` vs `role` — both exist, only `isAdmin` is used for access control. `role` is vestigial.
7. `isPaid` — only admin display, no business logic

### 🟡 Naming Inconsistency
8. `calendarType` (DB) vs `lunarToggle` (form) — works but confusing
9. `birthEnvironment` schema comment says "daylight saving" but actually stores geographic environment

### 🟡 Unused Form Fields
10. `subType`, `hexagram`, `direction`, `yearBuilt`, `ownerInfo` — sent in form payload but never read by backend (may be for future feng shui type)
11. `dateTime` — read by backend (qimen) but never sent by form (has fallback, so not a bug)

### Suggested Fixes
1. **Fix `timeMode`**: Change profile page from `'exact'` to `'precise'` (or accept both in backend)
2. **Remove dead fields**: `hourlyQuota`, `stripeSubscriptionId`, `subscriptionStatus`, `chatSummary` — create migration
3. **Remove dead code**: `updateChatSummary()` function in `chat/route.ts`
4. **Consider consolidating**: `isAdmin` + `role` into just `role` (or remove `role`)
5. **Fix schema comment**: `birthEnvironment` comment should reflect actual usage
6. **Consider renaming**: `lunarToggle` → `calendarType` in divination form for consistency
