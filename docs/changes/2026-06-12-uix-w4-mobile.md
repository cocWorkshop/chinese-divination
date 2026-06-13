# UIX W4 — Mobile & Capacitor polish

**Date:** 2026-06-12 · **Plan:** [uix-hci-audit-2026-06-12.md](../planning/uix-hci-audit-2026-06-12.md) workstream W4

## Shipped
- **E1 — Safe-area top on the expanded Master view:** the fixed overlay ignored the body's global safe-area padding; `paddingTop: env(safe-area-inset-top)` added to the overlay container so the header clears notches/status bars in the Capacitor WebView (env() = 0 on desktop).
- **E5 — Compact tablet navbar (768–1023px):** a `md:flex lg:hidden` group keeps the three core destinations (占卜 / 歷史 / 機緣商店) + NotificationBell visible; share/wiki/toggles/account stay in the hamburger. Previously the whole md band collapsed to hamburger-only.
- **E2 — Touch targets:** navbar hamburger → 44×44 hit area; mobile-menu items gained `py-1.5` (≥40px rows); register-page verification buttons → `min-h-[44px]`. (App-wide sweep continues opportunistically — most controls were already ≥44px.)

## Verified already adequate (audit corrections)
- **E4 — ZiWei palace grid on mobile:** tap-to-expand ALREADY exists — selecting a palace renders a detail card (stars/brightness/mutagen) below the grid; W1 added keyboard access to it. No change needed.

## Deliberately skipped
- **F3 — SSE render batching in MasterChatContext:** React 18 auto-batching already coalesces the multiple `setMessages` calls within one SSE read into a single render; render frequency is network-read-paced, not per-event. An rAF buffer would add interrupt-ordering risk (mid-flush abort + "(被打斷)" suffix) for marginal gain. Revisit only if low-end Android profiling shows real jank.
- **F4 — Master history pagination:** needs an API change to `/api/master` GET; deferred — bundle with the next master-module change.

## Deferred (needs external setup)
- **E3 — Capacitor push notifications:** the `PushNotifications` plugin is configured in capacitor.config.ts but unimplemented. Requires an FCM project + google-services.json + server-side sender — a standalone feature PR, not a polish item. The in-app completion toast (W3.4) covers the foreground case.

## Verification done
`npx tsc --noEmit` clean · `next lint` clean. Pending manual: Android emulator (notched device profile) — expanded Master header clearance, md-width navbar at 768–1023px.
