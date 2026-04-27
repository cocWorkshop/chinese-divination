# HCI Improvement Plan — XuanJi AI

**Audit date:** 2026-04-12
**Method:** Systematic walkthrough of all user-facing pages + the master chat widget + admin debug page, evaluated against Nielsen's 10 usability heuristics, accessibility basics (WCAG 2.1 AA), and domain-specific UX patterns for AI chat + divination apps.
**Scope:** Desktop viewport (1372×1253). Mobile viewport not tested (Playwright resize failed); flagged as a gap.

---

## Summary

The app has a strong visual identity (dark celestial theme, gold accents, serif typography) and the core divination flow works end-to-end. The refactored master widget delivers a genuinely good conversational UX with grounded, brief responses. The main HCI issues cluster around three themes:

1. **Discoverability** — users can't find features that exist (portrait page, master memory controls, reading history filters)
2. **Information density imbalance** — some pages are too sparse (homepage, divination select), others are walls of text (dashboard, privacy policy)
3. **Missing feedback loops** — several long-running operations (LLM calls, portrait extraction) lack adequate progress/status communication

---

## Critical — Usability Blockers

### C0. Master widget visible on login/register pages (broken flow)
**Page:** `/login`, `/register`
**Heuristic:** H5 (Error prevention), H8 (Aesthetic and minimalist design)

**Problem:** The collapsed master widget bar ("問問玄機大師...") renders on unauthenticated pages including login and register. Two issues:
1. **Functional breakage:** If a user types and hits Enter, the widget expands, POSTs to `/api/master`, receives a 401, and shows an error message. The interaction invites failure.
2. **False affordance:** The input field signals "you can interact with this" on a page where the single job is "get the user logged in." It's a distraction that clutters the auth flow.

**Fix:** Hide the widget entirely (collapsed + expanded) on unauthenticated pages. The `MasterChatWidget` already has `if (!enabled) return null` gated on `authenticated`, but verify no code path renders the collapsed bar outside that guard. Auth pages should have zero master widget presence.

**Effort:** Tiny (~5 LOC). Critical — currently a broken interaction on every visit.

### C1. Dashboard reading history is an unstructured wall of text
**Page:** `/dashboard`
**Heuristic:** H6 (Recognition rather than recall), H8 (Aesthetic and minimalist design)
**Screenshot:** hci-04b-dashboard-loaded.png

**Problem:** 65+ readings rendered as a single chronological list with no visual differentiation between divination types, no type-icon badges, no search, no filter, no pagination. Users cannot find a specific reading without scrolling through the entire list.

**Recommendation:**
- Add **type-filter chips** at the top (八字 / 紫微 / 易經 / ...) — toggle to show/hide
- Add **visual type badges** on each card (same icon + color as the divination-select page) so users can scan by color
- Add **search** (by question text, date range)
- **Paginate or virtualize** — show 10-20 per page with "load more" or infinite scroll
- Group by month/year headers for temporal context

**Effort:** Medium (~200 LOC). High UX impact.

### C2. No navigation path from `/profile` to `/profile/portrait`
**Page:** `/profile`
**Heuristic:** H3 (User control and freedom), H7 (Flexibility)

**Problem:** The new portrait page (`/profile/portrait`) exists but has no link from the existing profile page. Users must know the URL to reach it. The profile page has tabs ("個人資料", "家人", "設定") but no tab or link for "大師記憶".

**Recommendation:**
- Add a **new tab or card** on the profile page: "玄機大師記憶" with a brief description + link to `/profile/portrait`
- Alternatively, add a sidebar item if the profile page ever gets a sidebar layout
- The first-use disclosure modal already mentions "在個人資料中查看" — there must be a clickable path to reach it

**Effort:** Small (~30 LOC). Critical for feature discoverability.

### C3. Portrait page loading delay with no feedback
**Page:** `/profile/portrait`
**Heuristic:** H1 (Visibility of system status)

**Problem:** The portrait page shows "載入中..." (a plain text string) for 3-8 seconds while waiting for both `/api/profile/portrait` and `/api/master` to respond. No spinner, no skeleton, no progress indicator. Users may think the page is broken.

**Recommendation:**
- Use the existing `MysticalLoader` component (the animated yin-yang spinner used on `/dashboard`) instead of plain text
- Or add a skeleton layout that mirrors the section shapes (toggle, form, history)
- Load the two API calls in sequence rather than blocking both: show the toggle + form skeleton immediately, hydrate fields as data arrives

**Effort:** Small (~20 LOC). Important for perceived performance.

---

## High Priority — Significant UX Friction

### H1. Homepage hero section is too sparse
**Page:** `/`
**Heuristic:** H2 (Match between system and real world), H8 (Aesthetic)
**Screenshot:** hci-01-homepage.png

**Problem:** The hero section has the "玄機" title + tagline + two CTAs ("Start Divination" / "Register Free"), but the visual weight is very low. On a 1372px viewport, the content occupies ~15% of the visible area. The value proposition ("what this does and why I should care") isn't communicated until the user scrolls to the "Six Divination Systems" section below.

**Recommendation:**
- Elevate the **6-system summary** (icon grid) into the hero area or immediately below it, visible without scrolling
- Add a **1-sentence value prop** between the title and CTAs: "AI-powered Chinese divination — BaZi, Zi Wei, I Ching, and more — instant, grounded, and private."
- Add **social proof** or a reading count ("已為 3,000+ 用戶提供命理解讀") if you have the data
- The starfield animation is beautiful but makes text hard to read — consider a subtle gradient overlay behind the text block

**Effort:** Medium. High first-impression impact.

### H2. Master collapsed bar is easily confused with a search bar
**Page:** All pages (global widget)
**Heuristic:** H2 (Match between system and real world), H4 (Consistency)
**Screenshot:** hci-07-master-collapsed.png

**Problem:** The collapsed master widget at the bottom looks like a search bar: text input + button. Users who aren't expecting a chat agent might try to type a search query and be confused when a fullscreen chat opens. The 🧙‍♂️ icon is the only differentiator — but icons without labels are low-discoverability (H6).

**Recommendation:**
- Add a **subtle label** next to the icon: "玄機大師" in small gold serif text, visible in the collapsed bar
- Make the collapsed bar look more like a **chat bubble** and less like a search box: rounded, slightly elevated, maybe with a speech-bubble tail
- When the user has unread messages or a pending conversation, show a **badge dot** on the icon
- Consider a **floating button** (FAB) pattern instead of a full-width bar — it's more familiar as "this is a chat agent" from WhatsApp/Intercom patterns

**Effort:** Small-Medium. High discoverability impact.

### H3. Divination form is long with no progress indication
**Page:** `/divination/[type]`
**Heuristic:** H1 (Visibility of system status), H7 (Flexibility)
**Screenshot:** hci-03-divination-form.png

**Problem:** The BaZi form has 6-8 fields, a privacy section, and a paipan-only checkbox at the bottom. On mobile this could be 3+ scrolls. There's no progress indicator ("step 1 of 3") or collapsible sections. The "Consult Oracle" button is only visible after scrolling to the very bottom.

**Recommendation:**
- Add a **sticky submit button** at the bottom of the viewport (like mobile e-commerce "Add to Cart")
- Or add a **floating Karma cost badge** that stays visible as the user scrolls
- For bazi/ziwei (which have the most fields): consider a **2-step form** — Step 1: birth info; Step 2: options + question. With a progress bar.
- Mark required fields with a small asterisk (currently unclear which fields are required)

**Effort:** Medium. Reduces abandonment.

### H4. LLM response wait has limited progress feedback
**Page:** `/divination/[type]` (after submit)
**Heuristic:** H1 (Visibility of system status)

**Problem:** After clicking "Consult Oracle", the page shows a mystical spinner with "🔮 The oracle is processing your reading — this may take a few minutes." This is good, but during the 2-5 minute wait, nothing changes. Users don't know if it's still working, how far along it is, or if something went wrong.

**Recommendation:**
- Add a **time estimate** based on historical average latency per divination type: "通常需要 2-3 分鐘" (pulled from LlmLog avg latency)
- Add **progress milestones**: "計算命盤中..." → "AI 正在解讀..." → "生成報告中..." (based on elapsed time or server-sent events)
- Add a **cancel button** that lets the user abort and try again later
- Show a **"feel free to leave"** message more prominently — clarify the result will be saved even if they navigate away

**Effort:** Medium. Significant anxiety reduction.

### H5. No visual connection between portrait page and master widget
**Page:** `/profile/portrait` + master widget
**Heuristic:** H4 (Consistency), H6 (Recognition)

**Problem:** The portrait page and the master widget are conceptually connected (the portrait drives the master's behavior) but have no visual cross-reference. A user editing their portrait has no way to see the effect on the master without switching back to the chat. And the master's expanded view has no link to the portrait page.

**Recommendation:**
- In the master's expanded header (next to the ⋮ menu): add a small **"記憶設定"** link/icon that opens `/profile/portrait`
- On the portrait page: add a **"Try it out"** button that navigates to `/divination` and opens the master widget, so the user can see the effect of their edits immediately
- In the generated-prompt preview section: add a note "此上下文會在每次對話中自動加入大師的系統提示"

**Effort:** Small. Closes the conceptual gap.

---

## Medium Priority — Polish

### M1. Divination select page card layout is sparse on desktop
**Page:** `/divination`
**Screenshot:** hci-02-divination-select.png

Cards are in a 3-column grid but the page feels empty — large gaps between cards, no imagery, no reading count per type. Add a **subtle background illustration** per card (not just an emoji), show **"你已有 N 次紫微占卜"** per type for returning users, and consider a 2-column layout that fills the viewport better.

### M2. Generated prompt preview on portrait page looks non-native
**Page:** `/profile/portrait`

The `<pre>` block showing the rendered system prompt uses monospace font on a dark background — it looks like a code block, not a user-facing feature. Replace with a **styled card** using the app's serif font, gold accents, and the same section styling as the rest of the page. This is what the user sees as "what the master knows about me" — it should feel warm, not technical.

### M3. Admin debug page — destructive buttons too accessible
**Page:** `/admin/users/[id]/master`

The red "Reset portrait + history" and "Clear all chat history" buttons are visible without expanding any section. On a quick glance, an admin could accidentally click them. Move them into a **collapsed "Admin actions" section** (already has the `<details>` pattern from the chat section). Require **two clicks**: expand section → click button → confirmation modal.

### M4. Disclosure modal has no "disable memory" option visible
**Page:** Master widget (first-use disclosure)

The disclosure modal has "我了解，繼續使用" as the only gold CTA. The plan originally had a second button "關閉記憶功能" — it's missing from the implementation. Users who want to opt out on first encounter have to dismiss the modal, then navigate to `/profile/portrait`, then find the toggle. Add the **opt-out button** back into the modal per the original spec.

### M5. Reading cards in master chat have no type icon
**Page:** Master widget

The `reading_card` shows 📜 for all types. But the divination-select page uses type-specific icons (🏛️ for bazi, ⭐ for ziwei, etc.). The card should show the **type-specific icon** to help users recognize which reading they're looking at without reading the title text.

### M6. Dashboard has no link to start a new reading
**Page:** `/dashboard`

After viewing reading history, the natural next action might be "do another reading" — but there's no CTA. Add a **"+ 新占卜" floating button** or a top-right CTA that links to `/divination`.

---

## Low Priority — Nice-to-Have

### L1. Privacy policy is very long, no table of contents
Add a **sticky TOC sidebar** (desktop) or **jump links** (mobile) for the 12 sections. The new section 2a adds ~200 words; the total is now ~2000 words. Most users won't read it all — a TOC lets them find the section they care about.

### L2. No keyboard shortcut to open/close the master widget
Power users chatting with the master repeatedly would benefit from a **Cmd/Ctrl + K** or **Cmd/Ctrl + J** shortcut to toggle the widget open/closed. Low effort (~10 LOC).

### L3. Portrait history has no diff view
The portrait page shows history entries with topics/trigger/date but no visual diff between versions. A **side-by-side diff** or **highlighted changes** ("added: health, removed: travel") would make the history useful for understanding what changed and when. Currently it's a list of snapshots with no comparison.

### L4. Master greeting has no seasonal/contextual variation
The greeting text is static per state (1/2/3/4). A small touch: vary the greeting based on **time of day** ("早安" / "午安" / "晚安"), **Chinese calendar** (节气 / 节日), or **recent activity** ("你上次來是三天前"). Adds warmth without needing an LLM call — pure template logic.

### L5. No onboarding for first-time users
New users who've never used Chinese divination see the divination-select page with 6 unfamiliar system names. No explanation of "which one should I pick?" The master's greeting (State 1) helps, but the divination page itself could have a **"not sure which to choose?"** card that links to the master or a brief guide.

### L6. Subscribe page "機緣" concept is unexplained
New users encounter "機緣" (Karma points) as the currency but the concept is only named, not explained. Add a **tooltip or inline expansion** on first encounter: "機緣是你在玄機AI的占卜點數，每次占卜消耗 5 點。"

---

## Accessibility Gaps (WCAG 2.1 AA)

### A1. Color contrast on muted text
Several labels use `var(--text-muted)` which appears to be ~#666 on a ~#0a0a1a background. This is likely below the 4.5:1 contrast ratio required for AA small text. Audit with a contrast checker and bump to at least #999 or use a higher-contrast muted tone.

### A2. No focus indicators on custom buttons
The gold-styled buttons (Consult Oracle, Send, etc.) don't show visible focus rings when navigated with keyboard. Add `:focus-visible` styles with a gold outline.

### A3. Master widget has no ARIA live region
When new messages stream in, screen readers won't announce them. Add `aria-live="polite"` to the message container so streaming content is announced.

### A4. Missing `alt` text on decorative images
The yin-yang spinner, starfield background, and some card icons lack descriptive `alt` text or `aria-hidden="true"` markers. Decorative images should have `alt=""` + `aria-hidden="true"`; functional images (like type icons on cards) should have meaningful alt text.

---

## Mobile Gaps (Not Tested — Flagged)

Playwright viewport resize failed during this audit. These are known concerns that need mobile testing:

### Mobile-1: Master widget bottom bar may overlap page content
The collapsed bar is `fixed bottom-0` — on short mobile screens it may cover the page footer or the last divination card.

### Mobile-2: Divination form on mobile
Long forms on 390px screens need scroll-aware submit buttons and possibly step-by-step breakdown.

### Mobile-3: Portrait page on mobile
The editable form fields + generated prompt preview + history + danger zone is a lot of content for a single scroll. Consider a tabbed or accordion layout.

### Mobile-4: Admin debug page on mobile
This page is ops-only and desktop is fine, but if admins ever use mobile, the dense grid layouts will need responsive breakpoints.

---

## Prioritized Implementation Roadmap

| Priority | ID | Description | Effort | Impact |
|---|---|---|---|---|
| **Critical** | C0 | Hide master widget on login/register (broken 401 flow) | Tiny | Must-have |
| **Critical** | C2 | Add navigation link from /profile to /profile/portrait | S | Must-have |
| **Critical** | C1 | Dashboard filters + type badges + pagination | M | High |
| **Critical** | C3 | Portrait page loading spinner | S | Medium |
| **High** | H1 | Homepage hero density + value prop | M | High (first impression) |
| **High** | H2 | Master collapsed bar visual redesign | S-M | High (discoverability) |
| **High** | H3 | Divination form sticky submit + required markers | M | Medium (abandonment) |
| **High** | H4 | LLM wait progress milestones | M | Medium (anxiety) |
| **High** | H5 | Portrait ↔ master cross-navigation | S | Medium (conceptual) |
| **Medium** | M4 | Add disclosure modal opt-out button | S | Medium (privacy) |
| **Medium** | M5 | Reading card type-specific icons | S | Low-Medium |
| **Medium** | M1 | Divination select card enrichment | S-M | Low-Medium |
| **Medium** | M2 | Portrait prompt preview styled card | S | Low |
| **Medium** | M3 | Admin actions section collapsed by default | S | Low |
| **Medium** | M6 | Dashboard "new reading" CTA | S | Low-Medium |
| **Low** | L1-L6 | Various polish items | S each | Low |
| **Accessibility** | A1-A4 | WCAG AA compliance | S-M | Compliance |
| **Mobile** | M1-M4 | Mobile-specific testing + fixes | M | High for mobile users |

**Recommended first sprint:** C0 + C2 + C3 + M4 + H5 (all Small/Tiny, all high-value, all can ship in one PR).
**Recommended second sprint:** C1 + H2 + H3 (the three medium-effort items that drive the most daily UX improvement).
