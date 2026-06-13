# UI Improvement Proposal — Visual Review

**Date:** 2026-04-27  
**Status:** ✅ ALL P0/P1/P2 ITEMS IMPLEMENTED (2026-04-27)  
**Reviewed:** All pages at 1280px (desktop) + 390px (mobile)  
**Language tested:** zh-TW (primary)

---

## 1. Divination Selection Page

### Desktop (1280px) — Good
- 3-column grid clean and balanced
- Cost badges (✨ 5 點) visible on each card
- Welcome carousel centered nicely
- Master collapsed bar anchored at bottom

### Mobile (390px) — Issues Found

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 1.1 | Welcome carousel text is invisible — the banner area shows blank with only dots visible | **HIGH** | The carousel text might be hidden on mobile due to height constraint. Increase min-height of carousel banner on mobile or use `line-clamp-3` instead of fixed height |
| 1.2 | Bottom row (風水/梅花) partially obscured by master collapsed bar | Medium | Add `pb-20` to the grid container so the last row clears the bottom bar |
| 1.3 | Card descriptions truncated — not enough vertical space in 2-col layout | Low | Consider auto-height cards instead of fixed aspect ratio matching |
| 1.4 | No visual indicator that cards are tappable (no arrow, no "→") | Low | Add a subtle "→" or chevron on mobile card hover state |

---

## 2. Divination Form (BaZi)

### Desktop (1280px) — Good
- Form well-centered with `max-w-2xl`
- Mode switch (完整解盤/只排盤) visible at top
- Back link visible
- Auto-fill toast notifications stacked neatly

### Mobile (390px) — Issues Found

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 2.1 | Master collapsed bar overlaps the gender/birthplace section — user must scroll past it to see fields | **HIGH** | The bar covers ~60px at the bottom. The form already has `pb-16` but the master bar on this page sits on top of form content. Consider hiding master bar on divination form page, or increasing bottom padding |
| 2.2 | "← 返回占卜列表" back link appears outside the form card | Low | Move inside the card or make it sticky at top |
| 2.3 | Mode switch (完整解盤/只排盤) is very small text at mobile | Medium | Increase toggle pill size on mobile — `text-sm py-2` instead of `text-xs py-1.5` |
| 2.4 | Birth environment field ("例：農村、城市、山區...") is rarely used but always visible | Low | Collapse under "更多" details like FamilyDrawer does |
| 2.5 | Privacy settings collapsed `<details>` chevron (▼) is hard to see on dark background | Low | Use gold color for the chevron |

---

## 3. Dashboard / Reading History

### Desktop (1280px) — Good
- Type-colored left borders working well for visual scanning
- Filter tabs inline and readable
- Date + subject info on each card
- Delete confirmation inline (not modal)

### Mobile (390px) — Issues Found

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 3.1 | Filter tabs overflow horizontally — "梅花易數" and "風水佈局" tab text truncated | **HIGH** | Make filter row horizontally scrollable with `overflow-x-auto` + hide scrollbar + snap. Or use abbreviations on mobile (梅花/風水 without 易數/佈局) |
| 3.2 | Reading cards show long Chinese content preview that wraps to 3+ lines | Medium | Limit preview to `line-clamp-2` on mobile |
| 3.3 | "+ 新占卜" button is small and positioned at top-right — easy to miss on mobile | Medium | Make it a floating FAB or a full-width button below the title |
| 3.4 | Delete confirmation text (刪除/取消) is very small (10px) | Medium | Increase to 12px with more padding — these are destructive actions |
| 3.5 | Expanded reading content has no clear "collapse" affordance — user must scroll up and tap the card header | Low | Add a "收起 ▲" button at the bottom of expanded content |

---

## 4. Profile Page

### Desktop (1280px) — Good
- Tab navigation clear with text labels
- Two-column form layout for birth info
- Master memory quick-link visible

### Mobile (390px) — Issues Found

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 4.1 | Tab bar text labels are tiny (9px on mobile) — barely readable | **HIGH** | Increase to 10-11px, or use a horizontal scroll with full labels |
| 4.2 | "Master Xuanji Memory" card sits between avatar and tabs — breaks visual flow | Medium | Move below the tabs or integrate as a tab |
| 4.3 | Birth info section has no visual separation from personal info — feels like one long form | Low | Add a subtle divider or section background change |
| 4.4 | Save button at bottom requires full scroll — no sticky footer | Medium | Make save button sticky on mobile when form is dirty |

---

## 5. Karma Shop / Subscribe

### Desktop (1280px) — Good
- 3-column pricing cards balanced
- Cost table structured and readable
- "Popular" badge prominent on middle card

### Mobile (390px) — Issues Found

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 5.1 | Cost table at top is dense — divination names + costs all in small text, hard to scan | Medium | Use icon + name per row instead of inline text table |
| 5.2 | "≈ 2 次八字/紫微 或 6 次六爻/梅花" line wraps awkwardly | Low | Break into two lines: one for premium types, one for standard |
| 5.3 | "機緣永久有效，不會過期" footer text is barely visible | Low | Increase opacity from `text-muted` to `text-secondary` |
| 5.4 | Master collapsed bar partially covers the "← 返回占卜" link at bottom | Low | Add bottom padding |

---

## 6. Master Chat Widget

### Collapsed Bar — Issues Found

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 6.1 | Opener text truncates to one line on both desktop and mobile — users can't read the full greeting | Medium | Allow 2 lines on mobile with `line-clamp-2`, or show a shorter greeting |
| 6.2 | No visual pulse or attention-grabber on first visit — easy to ignore | Medium | Add a one-time subtle glow animation on the emoji for new users |
| 6.3 | Desktop floating pill style (lg breakpoint) — the `▸` chevron is hidden on mobile but the bar feels bare without it | Low | Show a subtle "展開" text hint on mobile |

### Expanded View — Based on previous review

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 6.4 | Long assistant messages can be a wall of text despite [NEXT] splitting | Medium | Already addressed with master.md prompt update — monitor LLM compliance |
| 6.5 | CTA cards need more visual weight — they look like regular messages | Low | Add a subtle left gold border or different background shade |

---

## 7. Cross-Page / Global Issues

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 7.1 | **Dark/Light mode inconsistency** — some pages use hardcoded `text-white/80` instead of CSS variables, meaning light mode text is invisible | **HIGH** | Audit all `text-white/*` classes → replace with `text-[var(--text-*)]` |
| 7.2 | **Footer overlaps with master collapsed bar** — on short-content pages, the footer and master bar compete for the same space | Medium | Add `min-h-screen` to main content area or increase footer bottom margin |
| 7.3 | **No loading skeleton** — page transitions show blank white/dark flash before content appears | Medium | Add lightweight skeleton placeholders for cards/lists |
| 7.4 | **Toast notifications** stack at top-right on desktop but cover the navigation bell on mobile | Low | Move toast position to bottom-center on mobile |
| 7.5 | **Scroll-to-top missing** — after viewing a long reading result, no quick way to scroll back up | Low | Add a scroll-to-top FAB that appears when scrolled > 500px |

---

## 8. Reading Result Pages (from prior sessions)

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 8.1 | Overview section (always-open) can be very long — no visual break from the chart drawer above | Medium | Add a subtle `border-t` or spacing increase between chart drawer and overview |
| 8.2 | Section TL;DR badges won't appear on old readings (no `sectionSummaries` field) | Low | Show badges only when data exists — already handled with `?.` chaining |
| 8.3 | Floating ☯ FAB can overlap with master collapsed bar on mobile | Medium | Position FAB higher (`bottom-24` instead of `bottom-20`) on pages where master bar is visible |
| 8.4 | Da Yun analysis cards (大運精批) have small text (10-11px for year ranges) | Low | Increase to 12px for readability |

---

## Priority Matrix

### P0 — Fix Now (Blocks usability)
| # | Item |
|---|------|
| 1.1 | Welcome carousel invisible on mobile |
| 2.1 | Master bar overlaps form fields on mobile |
| 3.1 | Dashboard filter tabs truncated on mobile |
| 4.1 | Profile tab labels too small on mobile |
| 7.1 | Dark/light mode hardcoded colors |

### P1 — Fix Soon (Reduces friction)
| # | Item |
|---|------|
| 1.2 | Bottom cards obscured by master bar |
| 2.3 | Mode switch too small on mobile |
| 3.3 | "+新占卜" button hard to find on mobile |
| 3.4 | Delete confirmation text too small |
| 4.4 | Sticky save button on mobile |
| 5.1 | Cost table dense on mobile |
| 6.1 | Opener text truncation |
| 7.2 | Footer/master bar overlap |
| 8.3 | FAB + master bar overlap |

### P2 — Polish
| # | Item |
|---|------|
| 1.3, 1.4, 2.2, 2.4, 2.5, 3.2, 3.5, 4.2, 4.3, 5.2, 5.3, 5.4, 6.2, 6.3, 6.5, 7.3, 7.4, 7.5, 8.1, 8.2, 8.4 |

---

## Quick Wins (< 30 min each)

1. `pb-20` on divination grid → fixes master bar overlap (1.2)
2. `overflow-x-auto` on dashboard filter row → fixes tab truncation (3.1)
3. Increase profile tab label size to 11px → fixes readability (4.1)
4. FAB `bottom-24` → fixes master bar overlap (8.3)
5. Privacy chevron `text-gold/50` → fixes visibility (2.5)
6. Delete confirmation `text-xs` → `text-sm` (3.4)

---

*Screenshots saved to `ui-review/` directory for reference.*
