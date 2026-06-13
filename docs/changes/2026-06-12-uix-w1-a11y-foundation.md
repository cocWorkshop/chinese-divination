# UIX W1 — Accessibility foundation

**Date:** 2026-06-12 · **Plan:** [uix-hci-audit-2026-06-12.md](../planning/uix-hci-audit-2026-06-12.md) workstream W1

## Motion (A1)
- **New `src/components/MotionProvider.tsx`** — wraps the app in `<MotionConfig reducedMotion="user">` (layout.tsx), so every Framer Motion transform/layout animation respects the OS reduce-motion setting.
- **globals.css** — `@media (prefers-reduced-motion: reduce)` blanket collapses ALL CSS keyframes/transitions (animate-spin/pulse, dotPulse, toolPulse, pendingPulse) to one instant frame.
- **MasterFab** — the infinite boxShadow "breathing glow" is gated by `useReducedMotion()` (MotionConfig doesn't cover boxShadow loops).

## Keyboard & focus (A2/A4)
- **BirthplaceInput** is now a real combobox: `role="combobox"` + `aria-expanded/controls/autocomplete/activedescendant` on the input, `role="listbox"`/`role="option"` + `aria-selected` on the dropdown, ArrowUp/Down wrap-around navigation, Enter selects, Escape closes, mouse hover and keyboard share one highlight state, active option scrolls into view. Group headers are `role="presentation"`.
- **MemoryGateModal** — `role="dialog"` + `aria-modal` + `aria-labelledby`, Escape = decline, focus moves to the Enable button on open, Tab toggles between the two buttons (two-element focus trap).

## Semantics (A6/A7/A9)
- Divination type cards on `/divination` were clickable `<div>`s → now `next/link` `<Link>` (keyboard + middle-click + SR navigation work; dead `handleClick`/`useRouter` removed). Welcome-message dots got aria-labels.
- `/notifications` expandable cards: `role="button"` + `tabIndex` + Enter/Space + `aria-expanded` + focus ring.
- ZiWei 12-palace grid cells: `role="button"` + `tabIndex` + Enter/Space toggle + `aria-pressed` + palace-name aria-label + focus ring.
- `role="status"` added to: MysticalLoader (all 3 variants), Master tool-running indicator, Master typing dots (+ "Master is typing" label), BirthplaceInput warning lines.
- **Form labels associated** (`htmlFor`/`id`) across all divination forms: bazi-/ziwei-/iching-/liuyao-/qimen-/meihua-/fengshui-/other- prefixes; shared `TimeModeInput` derives ids from its per-instance `layoutId`; `BirthplaceInput` gained an `inputId` prop forwarded to its input; `CalendarToggle`'s group heading label→span (labels can't address button groups).
- **Left as documented debt:** admin-page clickable divs (internal tooling), backdrop-click divs on modals (standard pattern).

## Color (A5) — verified, no change needed
BaZi five-element bars already pair each color with the element character + count; ZiWei 四化 colors carry 禄/权/科/忌 text superscripts; day-master badge shows the element name. Color is redundant, not sole channel.

## Contrast (A8)
Light-mode `--text-secondary` 0.6→0.72 alpha, `--text-muted` 0.4→0.55 (0.4 alpha computed to ~2.3:1 on the cream bg — far below AA). **Open design decision:** light-mode `--gold` (#b8860b) is ~3:1 — fine for large serif headings, below AA for small text; needs a real axe pass + designer call before changing a brand color.

## Verification done
`npx tsc --noEmit` exit 0 · `next lint` (src/app + src/components) clean · vitest 1066/1066.
Still pending (needs running app): axe DevTools pass, OS reduce-motion smoke test, screen-reader walkthrough.
