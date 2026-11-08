# UIX / HCI Audit & Improvement Plan — 2026-06-12

> **Status (2026-06-12): W0–W5 implemented** — see `docs/archive/changelog-2026-06.md` for what shipped, audit-claim corrections (several findings turned out already-solved or wrong — marked in those docs), and the deliberate skips/deferrals: live axe + screen-reader pass (needs running app), light-mode `--gold` contrast (design decision), remaining inline `lang === 'en'` ternaries (migrate opportunistically), Capacitor FCM push (standalone feature), master history pagination (bundle with next master change), admin-page semantics (internal tooling).

**Scope:** All user-facing surfaces — pages, divination flow, Master widget, forms, results, credits/payments, auth, notifications, mobile (Capacitor), accessibility, i18n.
**Relation to prior audits:** Successor to [hci-audit-2026-04-27.md](hci-audit-2026-04-27.md) (its P0/P1 all shipped, P2 mostly shipped). This audit re-baselines against the **current** code and focuses on what those passes did not cover: accessibility as a system, i18n architecture, long-LLM-call resilience, and error-handling consistency.
**Method:** 3 parallel code-exploration passes (pages/flows, component layer, cross-cutting concerns) + manual verification of every P0 claim. Items marked ✅ were hand-verified in code; unmarked items come from the exploration pass and should be re-confirmed in the file before fixing. No live user testing was performed.

---

## Executive Summary

The platform's core UX is mature — the 04-27 audit items landed (progress staging in the loader, cost badges on type cards ✅ [divination/page.tsx:189](../../src/app/divination/page.tsx#L189), skip-to-content link, memory-gate simplification, typed funnel). What remains is **systemic, not cosmetic**: the four biggest gaps are

1. **Accessibility has no foundation** — 16 `aria-label`s across 54 components, no focus management, no keyboard-dismiss, no `prefers-reduced-motion` outside StarField, color-only encodings in charts.
2. **i18n is 290 inline ternaries** (190 `lang === 'en'` + 102 `isEn`) with no central dictionary — coverage gaps are invisible until a user hits one (e.g. the divination error page is Chinese-only ✅).
3. **The 30–600s LLM wait degrades after 180s** — progress bar parks at 95%, no cancel/retry affordance, failed readings give no cause, form drafts are lost on tab close.
4. **Error handling is inconsistent** — Stripe checkout failure is silently swallowed ✅, API error shapes vary, no offline detection (relevant for the Android app).

This document proposes **31 items in 6 workstreams (A–F)**, phased so each workstream is independently shippable and verifiable.

---

## 1. Findings

### Theme A — Accessibility (severity: highest; systemic)

| # | Finding | Evidence |
|---|---|---|
| A1 ✅ | No `prefers-reduced-motion` support anywhere except StarField. Infinite pulse/breathing/rotation animations (FAB glow, loader, tool-status dots) fire for all users. | grep: only [StarField.tsx](../../src/components/StarField.tsx) matches; [MysticalLoader.tsx](../../src/components/MysticalLoader.tsx), [MasterFab.tsx](../../src/components/master/widget/MasterFab.tsx) |
| A2 ✅ | No Escape-to-close on the expanded Master view; the only keyboard handler is Enter-to-send on the textarea. No focus trap in the overlay; no focus return to FAB on collapse. | [ExpandedView.tsx:108](../../src/components/master/widget/ExpandedView.tsx#L108) is the sole `onKeyDown` in `src/components/master/` |
| A3 ✅ | aria-label coverage: 16 instances across 10 files for ~54 components. Header buttons in the expanded view (Memory / New chat) and CollapsedBar actions rely on `title` only. | grep `aria-label` in src |
| A4 | BirthplaceInput autocomplete is mouse-only: no ArrowUp/Down/Enter/Escape, results are `<li>` without combobox roles. | [BirthplaceInput.tsx](../../src/components/BirthplaceInput.tsx) dropdown ~lines 160–197 |
| A5 | Color-only encodings: five-element colors in the BaZi pillar chart and Si Hua star colors in the ZiWei grid have no text fallback or legend — invisible to color-blind users. | [BaziResult.tsx](../../src/components/results/BaziResult.tsx), [ZiweiResult.tsx](../../src/components/results/ZiweiResult.tsx) |
| A6 | Form inputs rely on placeholders as labels in several forms; no programmatic `<label htmlFor>` association in divination forms. | `src/app/divination/[type]/forms/*.tsx` |
| A7 | Streaming/tool state is visual-only: typing dots and the pulsing "Consulting records..." label have no `role="status"`/`aria-live`, so screen readers never hear that the Master is working. (Transcript itself does have `aria-live="polite"` — keep.) | [MessageBubble.tsx](../../src/components/master/widget/MessageBubble.tsx) ~210; [ExpandedView.tsx:212](../../src/components/master/widget/ExpandedView.tsx#L212) |
| A8 | Light-mode contrast untested; gold-on-light and text on translucent glass-cards likely fail WCAG AA in places. | [globals.css](../../src/app/globals.css) light-mode overrides |
| A9 | Remaining clickable non-button elements (prior audit 9.1 was only partially done). | codebase-wide sweep needed |

### Theme B — i18n architecture (severity: high; debt grows with every feature)

| # | Finding | Evidence |
|---|---|---|
| B1 ✅ | `src/app/divination/error.tsx` is Chinese-only — an English user whose reading errors sees "Divination service temporarily unavailable" with no translation. | [error.tsx:21-23](../../src/app/divination/error.tsx#L21) |
| B2 ✅ | 290 inline language ternaries (190 `lang === 'en'`, 102 `isEn`) and a per-file `T()` helper; no central dictionary, no key reuse, no way to audit coverage. | grep counts, 2026-06-12 |
| B3 | No `Intl.DateTimeFormat`/`NumberFormat` usage; dates and numbers render raw. Email templates hardcode English date phrasing ("This link expires in 24 hours"). | [email.ts](../../src/lib/email.ts) ~101 |
| B4 | Language switch re-renders the whole tree with no transition; risk of hydration mismatch on first paint if `lang` is briefly undefined. | [LanguageContext.tsx](../../src/components/LanguageContext.tsx) |

### Theme C — Long-running LLM flow (severity: high; this is the product's core moment)

| # | Finding | Evidence |
|---|---|---|
| C1 | The staged progress bar parks at 95% / "Almost complete" from 180s onward, but calls can run to 600s — up to 7 minutes of a frozen bar. Single static warning at 180s, no escalation, no elapsed-aware reassurance, no cancel-and-retry affordance. | [MysticalLoader.tsx](../../src/components/MysticalLoader.tsx) stage table; GeneratingState |
| C2 | Failed readings show a generic error card with retry but **no failure cause** (timeout vs. rate limit vs. validation), so repeated failures are undiagnosable for the user. | [reading/[id]/page.tsx](../../src/app/reading/[id]/page.tsx) failed branch |
| C3 | Form drafts are lost on tab close / navigation; only the post-hoc retry path (RETRY_CARRY_KEYS query params) restores inputs. No localStorage draft. | `src/app/divination/[type]/forms/` |
| C4 | If the user closes the tab mid-generation, recovery depends on them finding the pending reading in /dashboard; nothing proactively tells them "your reading continued and completed." (Master activation-resume partially covers this — only for CTA-originated readings.) | dashboard polling; [MasterChatContext.tsx](../../src/components/master/MasterChatContext.tsx) runActivationDispatch |
| C5 | BirthplaceInput has no "city not found" recovery path — rural/alt-spelling birthplaces dead-end (popular-cities fallback only fires on API failure, not on 0 results). | [BirthplaceInput.tsx](../../src/components/BirthplaceInput.tsx) |

### Theme D — Error handling & feedback consistency (severity: high for D1)

| # | Finding | Evidence |
|---|---|---|
| D1 ✅ | Stripe checkout failure is silently swallowed — spinner stops, no message, user doesn't know payment never started. | [subscribe/page.tsx:56-58](../../src/app/subscribe/page.tsx#L56) `catch { // ignore }` |
| D2 | API error response shapes vary (`{error}` vs `{message}`); client handling is per-callsite. | api routes; client fetch wrappers |
| D3 | No offline detection. On Android (Capacitor) with flaky connectivity, requests fail with no explanation. | no `navigator.onLine` / network listener in src |
| D4 | Optimistic UI (star rating, chat send) has no failure recovery — if the POST fails the optimistic state persists with no retry affordance. | [ReadingFeedback.tsx](../../src/components/ReadingFeedback.tsx) |
| D5 | Inline form validation is absent — all validation feedback arrives as toasts on submit. | divination forms |

### Theme E — Mobile & Capacitor (severity: medium)

| # | Finding | Evidence |
|---|---|---|
| E1 | Expanded Master view applies no top safe-area inset (`p-0 sm:p-4`) — header can collide with notch/status bar in the Android WebView. Bottom insets are handled correctly elsewhere. | [ExpandedView.tsx](../../src/components/master/widget/ExpandedView.tsx) container |
| E2 | Touch-target sweep incomplete: several controls (e.g. `px-5 py-2` buttons, dashboard card actions) fall under the 44–48px guideline. | auth pages, dashboard cards |
| E3 | Capacitor `PushNotifications` plugin is configured but unimplemented — Android users get no push for completed readings / daily bonus / compensation expiry. This pairs with C4. | [capacitor.config.ts](../../capacitor.config.ts) ~21 |
| E4 | ZiWei 4×4 palace grid is unreadable on phones (3–4 lines of tiny text per cell, no tap-to-expand). | [ZiweiResult.tsx](../../src/components/results/ZiweiResult.tsx) GRID_POSITIONS |
| E5 | Navbar still collapses to hamburger for the whole 768–1023px band (prior audit 1.1 — proposed, not implemented). | [Navbar.tsx](../../src/components/Navbar.tsx) |

### Theme F — Interaction polish & engagement (severity: medium/low)

| # | Finding | Evidence |
|---|---|---|
| F1 | CTA/reading cards are buffered until the SSE `done` event — the user watches prose settle and waits for the actionable button ("where's the card?" moment). Intentional design, but worth a perception fix (placeholder shimmer where the card will land). | [MasterChatContext.tsx:514](../../src/components/master/MasterChatContext.tsx#L514) |
| F2 | Interrupt rate-limit (6/60s) silently drops messages after a one-time toast — user may not realize a message never sent. | [MasterChatContext.tsx:771-786](../../src/components/master/MasterChatContext.tsx#L771) |
| F3 | Every SSE `content` chunk triggers `setMessages` — long replies cause render churn on low-end Android devices. Batch via rAF/throttle. | MasterChatContext reader loop |
| F4 | Master history loads unpaginated on every mount (`cache: 'no-store'`) — slow for heavy users. | [MasterChatContext.tsx:339](../../src/components/master/MasterChatContext.tsx#L339) |
| F5 | No in-app notification center — toast-only via NotificationPopup; bell exists but no persistent list/read-state UI surface. Notification `type` (info/warning/promo) isn't visually differentiated. | [NotificationPopup.tsx](../../src/components/NotificationPopup.tsx), [NotificationBell.tsx](../../src/components/NotificationBell.tsx) |
| F6 | Share is discoverable only from the navbar and result page; dashboard cards have share but result page export (PDF/image/print stylesheet) is missing — high-value for a product whose output users want to keep/forward. | [ShareResultButton.tsx](../../src/components/ShareResultButton.tsx) |
| F7 | Marketing emails lack an unsubscribe link (compliance + trust). | [email.ts](../../src/lib/email.ts) footer |
| F8 | Empty states are minimal: zero-reading dashboard, zero family members, zero credit history have text but no contextual CTA. | dashboard, profile tabs |
| F9 | No documented design tokens/spacing scale; styles are ad-hoc Tailwind. Fine today, but every theme above will touch shared patterns — extract as you go (focus ring, button, drawer), not as a big-bang. | src/components |

### Corrections to agent-reported findings (verified false / already done)

- Cost badges **are** shown on divination type cards ✅ ([divination/page.tsx:189](../../src/app/divination/page.tsx#L189)) — prior audit 1.2 shipped.
- Skip-to-content link exists ✅ (layout.tsx).
- Transcript `aria-live` exists ✅ (ExpandedView).
- Input autofocus on expand exists ✅ (ExpandedView ~90).

---

## 2. Improvement Plan

Phased like the architecture-improvement-plan: each workstream is independently shippable, with explicit verification. Suggested order: **W0 → W1 → W2 → W3**, then W4/W5 as capacity allows. Don't interleave workstreams in one PR.

### W0 — Quick wins (1 short session; all ✅-verified bugs)

| Item | Fix | Files |
|---|---|---|
| B1 | Bilingual divination error page (use localStorage lang like global error.tsx does) | src/app/divination/error.tsx |
| D1 | Toast on Stripe checkout failure + insufficient-response handling | src/app/subscribe/page.tsx |
| A2a | Escape closes expanded Master view; collapse returns focus to FAB | ExpandedView.tsx, MasterChatContext |
| A3a | aria-labels on Master widget header buttons + CollapsedBar actions | ExpandedView.tsx, CollapsedBar.tsx |
| F2 | Persistent cooldown indicator when interrupt rate-limit hits (replace silent drop) | MasterChatContext.tsx |

**Verify:** keyboard-only pass of the Master widget (Tab → expand → Esc → focus back on FAB); simulate checkout fetch failure; switch lang=en and throw in a divination page.

### W1 — Accessibility foundation (1–2 sessions)

1. **Motion:** add a `useReducedMotion()` hook (or framer-motion's built-in) and gate all infinite/decorative animations (loader, FAB glow, pulses, StarField already done). (A1)
2. **Keyboard:** combobox pattern for BirthplaceInput (roles + arrow/Enter/Escape); focus trap in expanded Master view and modals (MemoryGate, delete confirms). (A2/A4)
3. **Semantics:** sweep remaining clickable divs → `<button>`; `<label htmlFor>` on all divination-form inputs; `role="status"` on typing dots + tool-status label. (A6/A7/A9)
4. **Color:** element-name text (Wood/Fire/Earth/Metal/Water) beside color blocks in BaZi chart; text/icon fallback for Si Hua colors in ZiWei. (A5)
5. **Contrast:** run axe/Lighthouse on dark + light mode; fix failures in globals.css tokens. (A8)

**Verify:** axe DevTools clean on /divination/bazi form + result + Master expanded (both themes); full keyboard-only journey: login → form → submit → result → chat; OS-level reduce-motion shows static loader.

### W2 — i18n re-architecture (1–2 sessions; mechanical but wide)

1. Create `src/lib/i18n/` with typed dictionaries (`zh-TW.ts`, `en.ts`, key union type) and a `useT()` hook; keep the existing LanguageContext as the source of `lang`. (B2)
2. Migrate incrementally **by surface** (error/loading pages → auth → forms → results → Master widget) — each migration PR deletes the local `T()`/ternaries it replaces. No big-bang.
3. Add `Intl.DateTimeFormat`/`NumberFormat` helpers in the same module; apply to dashboard dates, credit ledger, email templates. (B3)
4. Lint guard: ESLint rule or CI grep failing on new `lang === 'en'` ternaries outside `src/lib/i18n/`.

**Verify:** grep count of inline ternaries trends to ~0; en + zh-TW walkthrough of every migrated surface; snapshot tests for email templates in both languages.

### W3 — Long-call resilience (1–2 sessions; touches the core product moment)

1. **Honest progress past 180s:** replace the parked 95% bar with an elapsed-aware state ("Elapsed 4:32 — Deep reasoning in progress, may take up to 10 minutes"), refresh reassurance every 60s, and add **Cancel & retry** after 300s. (C1)
2. **Failure causes:** map server failure categories (timeout / provider error / validation hard-reject) to user-facing reason + tailored advice on the failed-reading card; credits-not-deducted note already exists — keep. (C2)
3. **Draft persistence:** localStorage draft per divination type (debounced save, restore banner on return, clear on successful submit). (C3)
4. **Completion handoff:** on reading completion while user is elsewhere, raise the existing NotificationPopup + dashboard badge (in-app first; Capacitor push lands in W4). (C4)
5. **Birthplace dead-end:** on 0 results, offer popular-city fallback + free-text "use as-is with default coordinates" path with an honesty note about accuracy. (C5)

**Verify:** throttle the LLM endpoint to force a 5-min generation and walk the timeline; kill a reading server-side and check the reason renders; fill a form, close the tab, return — draft restores; submit clears it.

### W4 — Mobile & Capacitor (1–2 sessions)

- Top safe-area inset on expanded Master view (E1); touch-target sweep to ≥44px (E2); ZiWei palace tap-to-expand sheet on <sm (E4); compact icon navbar at md (E5).
- Implement Capacitor push notifications for reading-complete + daily bonus (E3) — needs FCM setup; scope as its own PR.
- SSE render batching via rAF throttle in MasterChatContext (F3) + paginate master history (F4).

**Verify:** Android build on a notched device (or emulator) — widget, forms, ZiWei result at 390px; push received with app backgrounded.

### W5 — Engagement & polish (ongoing, low risk)

- Notification center page/dropdown with read-state + type styling (F5); email unsubscribe link (F7).
- Result export: print stylesheet first (cheap), then share-image generation (F6).
- Empty-state CTAs for dashboard/family/credits (F8).
- CTA-card placeholder shimmer during SSE buffering (F1).
- Extract shared UI primitives opportunistically as W1–W4 touch them (F9).

### Priority matrix

| Item | Impact | Effort | Priority |
|---|---|---|---|
| W0 (all five) | High | Low | **P0** |
| W1 a11y foundation | High (reach + risk) | Medium | **P0** |
| W3.1 honest progress + cancel | High (core moment) | Low–Med | **P0** |
| W3.2 failure causes | High | Medium | **P1** |
| W2 i18n re-architecture | High (debt) | Medium (mechanical) | **P1** |
| W3.3 draft persistence | Medium | Low | **P1** |
| W4 safe-area / touch / ZiWei mobile | Medium | Medium | **P1** |
| W4 push notifications | Medium | High | **P2** |
| W3.4 completion handoff (in-app) | Medium | Low | **P2** |
| W5 items | Low–Medium | Low–Medium | **P2/P3** |

---

## 3. Standing verification rig (do once in W0, reuse every workstream)

- **axe + Lighthouse a11y** run on the 5 canonical pages (landing, form, generating, result, Master expanded) in both themes — record scores in the PR description.
- **Keyboard-only script:** documented click-free journey from login to a completed reading + chat turn.
- **Viewport set:** 390 / 768 / 1024 / 1280, plus Android emulator with notch.
- **Both languages** for any surface a PR touches.

---

Recommended opening prompt for new sessions: "Please read docs/archive/uix-hci-audit-2026-06-12.md, start implementation from W0 quick wins (all five verified in code), and run the §3 verification rig upon completion."
