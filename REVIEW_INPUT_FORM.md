# Input Form Review — BaZi & ZiWei

**File:** `src/app/divination/[type]/page.tsx`
**Reviewed:** 2026-03-24

---

## Issues Found

### 1. Profile init API does NOT return `birthLat` / `birthLng`
- **File:** `src/app/api/init/route.ts`, lines 73-75
- **What's wrong:** The `select` clause fetches `birthDate, birthTime, birthPlace, gender, calendarType, timeMode, exactTime, birthEnvironment` but **omits `birthLat` and `birthLng`**. When a user reloads the page, their previously-saved coordinates are lost. If they're in precise mode, the backend won't receive coordinates for true solar time correction unless they re-select their birthplace.
- **Suggested fix:** Add `birthLat: true, birthLng: true` to the select clause, and in the form page, call `setBirthLat(p.birthLat)` / `setBirthLng(p.birthLng)` during profile auto-fill.

### 2. Profile save does NOT persist `birthLat` / `birthLng`
- **File:** `src/app/api/divination/route.ts`, lines ~1060-1075 (the `shouldSaveProfile` block)
- **What's wrong:** The profile update saves `birthDate, birthTime, birthPlace, gender, timeMode, exactTime, calendarType, birthEnvironment` but **never saves `birthLat` or `birthLng`**. Even though the User model has these columns and the form sends them in `formData`, the save logic ignores them.
- **Suggested fix:** Add:
  ```ts
  if (inputData.birthLat != null) profileUpdate.birthLat = inputData.birthLat
  if (inputData.birthLng != null) profileUpdate.birthLng = inputData.birthLng
  ```
  Note: `profileUpdate` is typed as `Record<string, string | null>` — needs to be widened to accept `number | null` for lat/lng.

### 3. `selfProfileRef` does NOT include `birthLat` / `birthLng`
- **File:** `page.tsx`, line ~103 (selfProfileRef type) and line ~137 (selfProfileRef assignment)
- **What's wrong:** When switching from "self" → "family" → back to "self", the form fields are restored from `selfProfileRef.current`, but `birthLat` and `birthLng` are separate state variables that are **never saved to or restored from** `selfProfileRef`. The user's coordinates are silently lost.
- **Suggested fix:** Either add `birthLat` / `birthLng` to `selfProfileRef` and restore them on switch-back, or create a separate ref for coordinates.

### 4. ZiWei section is missing the `birthEnvironment` field
- **File:** `page.tsx`, the `{type === 'ziwei' && ...}` block (lines ~340-420)
- **What's wrong:** BaZi has a "Birth Environment (optional)" input field, but the ZiWei section does not include it. While birthEnvironment may be less critical for ZiWei, the profile auto-fill loads it and the save logic persists it — so the field should be consistent across both types, or at least the value shouldn't be silently cleared when using ZiWei.
- **Suggested fix:** Add the birthEnvironment field to the ZiWei section (copy from BaZi), or explicitly document why it's omitted.

### 5. ZiWei precise mode does NOT enforce birthplace requirement
- **File:** `page.tsx`, `handleSubmit` function (line ~195)
- **What's wrong:** The validation `if (type === 'bazi' && form.timeMode === 'precise' && !form.birthPlace)` only checks for BaZi. ZiWei also supports precise time mode with the same birthplace-for-solar-time logic, but there's no equivalent validation. A user can submit ZiWei in precise mode without a birthplace.
- **Suggested fix:** Change the condition to:
  ```ts
  if (['bazi', 'ziwei'].includes(type) && form.timeMode === 'precise' && !form.birthPlace)
  ```

### 6. `readingDateTime` is initialized and sent but never consumed
- **File:** `page.tsx`, line ~98 (`readingDateTime: new Date().toISOString().slice(0, 16)`)
- **What's wrong:** The form state includes `readingDateTime` which is initialized to "now" and included in `formData` sent to `/api/divination`. However, the backend (`src/app/api/divination/route.ts`) has **zero references** to `readingDateTime`. It's dead data in the payload for bazi/ziwei. The QiMen section renders a datetime-local input for it (correct), but the backend doesn't read it either.
- **Impact:** Low — it's just wasted bytes in the request. But it's confusing for maintenance.
- **Suggested fix:** Either remove it from form initialization (keep it only when qimen/other types need it), or have the backend actually use it for qimen readings.

### 7. BirthplaceInput: manually typed text without selection sends no coordinates
- **File:** `src/components/BirthplaceInput.tsx`
- **What's wrong:** If a user types a birthplace name but doesn't select from the dropdown (e.g., types "Beijing" and tabs away), `onLatLngChange` is never called. The form will have `birthPlace = "Beijing"` but `birthLat = null, birthLng = null`. In precise mode for BaZi, the validation only checks `!form.birthPlace` (which passes), so the form submits without coordinates — the backend then can't do true solar time correction.
- **Suggested fix:** Either (a) make the input selection-only (clear text if no selection is made), or (b) add validation that `birthLat` must be non-null when `timeMode === 'precise'`, or (c) do a geocode lookup on blur if coordinates are missing.

### 8. Profile auto-fill does NOT restore `birthLat`/`birthLng` from family members (partially works)
- **File:** `page.tsx`, `handleMemberSelect` function (line ~145)
- **What's wrong:** Family member selection DOES set `setBirthLat(member.birthLat)` and `setBirthLng(member.birthLng)` — this is correct. However, the **self profile** auto-fill (lines ~127-140) does NOT set birthLat/birthLng because the init API doesn't return them (see Issue #1). So the family path works, but the self path doesn't.
- **Suggested fix:** Fix Issue #1 (return lat/lng from init API) and add `setBirthLat`/`setBirthLng` calls in the profile auto-fill block.

### 9. `targetType` selector shows for ALL divination types, not just bazi/ziwei
- **File:** `page.tsx`, the "Target Person Selection" block (line ~228)
- **What's wrong:** The "For Myself / For Someone Else" toggle is rendered for all types when `session` exists — including iching, liuyao, qimen, fengshui. For I Ching and Liu Yao, divination is about a specific question, not a person's birth chart. The "for others" flow auto-fills birth data fields that don't even exist for these types, making the UX confusing.
- **Suggested fix:** Wrap the target person selection in `['bazi', 'ziwei'].includes(type)` (or whichever types actually use personal birth data).

### 10. Southern hemisphere check applies to bazi/ziwei but error blocks submit for all types
- **File:** `page.tsx`, submit button disabled condition (line ~507)
- **What's wrong:** The disabled condition `isSouthernHemisphere && ['bazi', 'ziwei'].includes(type)` is correct. The `handleSubmit` validation (line ~192) also correctly scopes it. No actual bug here — just noting it's consistent. ✅

### 11. `birthEnvironment` field purpose — is it used?
- **File:** `src/app/api/divination/route.ts`, line ~394
- **What's wrong:** Nothing wrong. `birthEnvironment` IS used in the BaZi prompt: `${inputData.birthEnvironment ? '- 出生地环境：${inputData.birthEnvironment}' : ''}`. It provides context to the LLM about the birth setting (rural, urban, mountainous) which can influence interpretation. It's appropriately optional.

### 12. Shichen options — all 13 render correctly ✅
- 早子時, 晚子時, 丑時, 寅時, 卯時, 辰時, 巳時, 午時, 未時, 申時, 酉時, 戌時, 亥時 = 13 options. Correct.

### 13. Lunar conversion — where does it happen?
- **File:** `src/app/api/divination/route.ts` (not in the form page)
- **What's wrong:** The form page sends `lunarToggle: 'solar' | 'lunar'` as part of `inputData`. The actual conversion must happen server-side. Verified: the backend handles lunar→solar conversion via a library. The toggle itself works correctly on the form. ✅

### 14. Save profile checkbox doesn't apply when `targetType === 'family'` with `__new__` member
- **File:** `page.tsx` form submission / `src/app/api/divination/route.ts` profile save block
- **What's wrong:** When creating a new family member (`selectedMemberId === '__new__'`), the `saveProfile` checkbox text says "Save birth info to my profile" — but the backend save logic routes to the family member update when `targetType === 'family'`. For a **new** member being created in the same request, the save goes to `prisma.familyMember.update({ where: { id: resolvedFamilyMemberId } })` which should work if the member was created in the init step. However, the label is misleading — it says "my profile" but actually saves to the family member record.
- **Suggested fix:** Change the label text when `targetType === 'family'` to say "Save birth info to this family member's profile" or similar.

---

## Summary

| # | Severity | Description |
|---|----------|-------------|
| 1 | 🔴 High | Init API doesn't return birthLat/birthLng — coordinates lost on page reload |
| 2 | 🔴 High | Profile save doesn't persist birthLat/birthLng — coordinates never saved |
| 3 | 🟡 Medium | selfProfileRef doesn't track birthLat/birthLng — lost on self↔family switch |
| 4 | 🟡 Medium | ZiWei missing birthEnvironment field |
| 5 | 🟡 Medium | ZiWei precise mode doesn't validate birthplace requirement |
| 6 | 🟢 Low | readingDateTime initialized but unused by backend |
| 7 | 🟡 Medium | Typed (non-selected) birthplace sends no coordinates but passes validation |
| 8 | 🔴 High | Self profile auto-fill missing birthLat/birthLng (consequence of #1) |
| 9 | 🟡 Medium | Target person selector shows for non-birth-chart divination types |
| 14 | 🟢 Low | Save profile label misleading for family member target |
