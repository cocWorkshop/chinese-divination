# UIX W5 — Engagement polish

**Date:** 2026-06-12 · **Plan:** [uix-hci-audit-2026-06-12.md](../planning/uix-hci-audit-2026-06-12.md) workstream W5

## Shipped
- **Print stylesheet (F6, first half):** `@media print` block in globals.css — nav/footer/dialogs/StarField hidden, dark theme flattened to white with dark text, glass-cards become plain bordered boxes with `break-inside: avoid`. Ctrl+P on a reading now yields a clean keepsake document. (Deliberately does NOT hide buttons — SectionDrawer headers are buttons carrying the section titles.)
- **Dashboard empty state (F8):** zero-readings card now explains the next step and carries a 「開始占卜 →」 CTA to `/divination`. FamilyTab's empty state was verified already adequate (explains value + add flow); credits ledger left as-is.

## Verified already adequate (audit corrections)
- **F5 — notification center:** `/notifications` EXISTS — full list with per-type icon/color (TYPE_CONFIG), read-state, expand-to-read; NotificationBell in the navbar. The audit's "toast-only, no persistent surface" claim was wrong. W1 added keyboard access to its cards.
- **F7 — email unsubscribe:** every email in `src/lib/email.ts` is transactional (verification, password reset, compensation claim, account deletion) — no marketing sends exist, so an unsubscribe link is not required. Revisit only if marketing email is ever added.

## Deliberately deferred
- **F1 — CTA-card placeholder shimmer:** cards buffer until the SSE `done` event by design (prose settles first); the gap is short and the tool-status line (「備下卦席中…」) already signals work. A placeholder bubble would fight the bubble-ordering logic. Revisit with user feedback.
- **F6 second half — share-image generation:** standalone feature (canvas/OG-image render of a reading); print covers the immediate need.

## Verification done
`npx tsc --noEmit` clean · `next lint` clean · `scripts/check-i18n.sh` passes · vitest **1066/1066** (final pass over the whole W0–W5 batch).
