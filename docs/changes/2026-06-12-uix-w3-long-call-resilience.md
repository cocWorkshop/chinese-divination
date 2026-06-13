# UIX W3 — Long-call resilience

**Date:** 2026-06-12 · **Plan:** [uix-hci-audit-2026-06-12.md](../planning/uix-hci-audit-2026-06-12.md) workstream W3

## W3.1 — Honest progress past 180s + cancel affordance
- **MysticalLoader**: past 180s the bar no longer parks at a frozen 95% — it creeps asymptotically 95→99% across the 600s server ceiling, and the stage label becomes elapsed-aware, updating each minute: 「深度推理中（已 N 分鐘）— 複雜命盤最長可能需要 10 分鐘」.
- New optional `onCancel` prop (threaded through LoadingOracle): after **300s** a 「取消並返回表單（已填資料會保留）」 button appears. GeneratingState wires it to the existing `resetToForm()` (aborts the SSE fetch, returns to stage 1 with the form intact). The pending-reading view on `/reading/[id]` does NOT pass onCancel — cancelling a server-side pending reading has no client abort semantics.

## W3.2 — Failure causes on the failed-reading card
`markFailed` already stores the technical reason in `Reading.result`. `reading/[id]/page.tsx` now maps it via `describeFailure()` to a bilingual cause + tailored advice: timeout → "retry now usually succeeds"; rate-limit/busy → "wait a minute"; JSON parse / output format → "transient AI glitch, retry"; service-not-configured → "retrying won't help, contact support"; unknown → generic. Rendered between the headline and the credits-not-deducted note.

## W3.3 — Form draft persistence
`useDivinationForm`:
- **Autosave**: debounced 800ms write of the whole form to `localStorage["divinationDraft:{type}"]` — gated on a real user edit (`setField`), so initial/auto-filled state never overwrites a draft.
- **Restore**: on mount, when there are NO query params (CTA-prefill/retry params always win), a draft <24h old is merged in (empty values skipped, `readingDateTime` deliberately excluded — stale event time is worse than the fresh default), `paramsHydratedRef` is set so `/api/init` auto-fill doesn't clobber it, and a 📝 toast announces the restore.
- **Clear**: `useDivinationStream.notifyReadingComplete()` (the single success point across stream/poll paths) removes the draft.
- Privacy note: drafts hold birth data in localStorage on the user's own device, same data class as the profile autofill cache (10.1 of the 04-27 audit). Acceptable; revisit if a "private device" toggle ever ships.

## W3.4 — Completion handoff (in-app)
Dashboard's 15s pending-poll now toasts on transition: completed → 「您的解讀已完成 — 點擊卡片查看」, failed → 「有一筆解讀生成失敗，機緣已退還」. Cross-device/push handoff remains W4 (Capacitor push).

## W3.5 — Birthplace "city not found" recovery
`BirthplaceInput`: a completed search with zero nominatim hits AND zero preset matches now opens a fallback panel instead of nothing: explanatory line (suggest alternate spelling), a 「直接使用『{輸入}』（無座標，僅供參考）」 escape hatch (keeps the text, sets lat/lng null — fuzzy mode works fine; precise mode still validates at submit), and the top-5 popular cities as buttons.

## Verification done
`npx tsc --noEmit` clean · `next lint` clean · vitest 1066/1066.
Manual scenarios for the verify pass: throttle/hang the LLM to walk the 3-min → 5-min timeline; fill a form, close the tab, reopen (draft restores; submit clears); search a nonsense city name (fallback panel); view a failed reading (cause text).
