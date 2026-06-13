# UIX W0 — Quick wins from the 2026-06-12 UIX/HCI audit

**Date:** 2026-06-12 · **Plan:** [uix-hci-audit-2026-06-12.md](../planning/uix-hci-audit-2026-06-12.md) workstream W0 (items B1, D1, A2a, A3a, F2)

## B1 — Bilingual divination error page
`src/app/divination/error.tsx` was Chinese-only (the global `error.tsx` was already bilingual). Now uses `useLang()` like the global page; heading, body, Retry and Back-to-Home buttons all localized.

## D1 — Stripe checkout failure feedback
`subscribe/page.tsx` `handlePurchase` had `catch { /* ignore */ }` — a failed `/api/stripe/checkout` call left the user with a stopped spinner and no message. Now:
- non-`url` response → `toast.error(data.error || …)` (the route returns `{error}` on 400/401/404)
- network throw → bilingual "could not reach payment service" toast
- on success the early `return` keeps the loading state through the redirect instead of flashing it off.

## A2a — Escape closes the expanded Master view + focus return
- `ExpandedView` adds a document-level `Escape` keydown listener → `setShape('collapsed')`. Skipped while the memory-gate modal is up (new `gateVisible` prop passed down from `MasterChatWidget` — `needsMemoryGate` alone is true even when the modal isn't showing, which would have wrongly disabled Escape).
- Focus return: `MasterChatWidget` tracks the shape transition with a ref; only an expanded→collapsed transition passes `focusOnMount` to `MasterFab` / `CollapsedBar`, which then focus their primary button. Initial page load never steals focus.

## A3a — Master widget aria/dialog semantics
- Expanded container: `role="dialog"` + `aria-modal="true"` + localized `aria-label`.
- `aria-label` added to the Memory and New-chat header buttons (were `title`-only); the close button's hardcoded `aria-label="Collapse"` is now localized ("Close chat" / 「收合對話」).
- `CollapsedBar` / `MasterFab` already had labels — unchanged.

## F2 — Visible cooldown when the interrupt rate-limit drops messages
Mid-stream interrupts beyond 6/60s were silently dropped after the user's bubbles had **already rendered** — the transient toast was the only signal the messages never reached the master. Now:
- `MasterChatContext` exposes `interruptCooldownUntil` (epoch ms when the sliding window frees a slot, computed from the oldest interrupt timestamp; self-clears shortly after expiry).
- `ExpandedView` renders a persistent `role="status"` notice above the input with a live per-second countdown: "剛才的訊息未送出 — 打斷過於頻繁…約 Ns 後再試". The toast is kept for immediate feedback.

## Verification done
`npx tsc --noEmit` exit 0 · `next lint` on all 7 touched files clean · `vitest run` 1066/1066.
Manual checks still recommended (no E2E rig yet — W0 of the audit proposes one): keyboard pass (Tab → FAB → Enter → Esc → focus back on FAB), checkout failure with Stripe env unset, lang=en on a divination error.
