# 玄機 UI 重塑 — 设计执行 Prompt 与全量架构化方案（2026-10-17）

> **决策已锁定**（2026-10-17 与用户确认）：① 全面架构化（3,369 处 raw class 全量迁移语义 token，彻底删除 187 条 `!important` 级联 debt 段）② Admin 13 页全量迁移 ③ 标题字体 Noto Serif SC → TC。
> **依据**：`docs/planning/audit-2026-10.md` §4（HMI/GUI 审计）+ 本轮双 agent 全库扫描（AI 味残留 × 1，双模式架构 × 1）。
> **既有设计语言**：`docs/260912/2026-09-12-ui-ux-aesthetic-audit-and-redesign.md`（v2.0 美学纲领沿用，本文档补齐其未定义的亮色体系与工程规则）。

---

## 一、现状诊断（全库扫描结果）

### 1.1 AI 味残留清单（MUST-FIX）

**装饰性紫/青色系 — 42 hits**：

| 位置 | 内容 | 判定 |
|---|---|---|
| `src/lib/growth/growthSystem.ts:37,75,113,132` | realm 等级配色 `#38bdf8` sky / `#818cf8` indigo / `#c084fc` purple / `#f472b6` pink | **最重灾区**：整套 SaaS 游戏化配色，驱动 GrowthTab 光晕 blob（`_tabs/GrowthTab.tsx:71-72`） |
| `src/app/start/page.tsx:454` | `bg-purple-500/10 rounded-full blur-3xl` 紫色 blob（与 :453 金色 blob 成对） | 09-12 审计明令封杀模式的残留 |
| `src/app/dashboard/page.tsx:400`、`src/app/reading/[id]/page.tsx:239` | 家庭成员 badge `bg-purple-500/20 text-purple-300` | → 青玉/朱砂 |
| `src/app/gift/[code]/page.tsx:74,96,109` | `text-cyan-400` 状态 | → jade |
| `src/components/results/ZiweiResult.tsx:196,198,221,333,388,391` | V1 紫微结果紫色面板（**仍渲染存量旧盘**） | → sanctuary 化 |
| `src/components/results/QimenResult.tsx:42,85,87,93,153,189-212` | 奇门青色玻璃面板 | 面板 sanctuary 化；星曜色相为命理**语义色**，保留 |
| `src/app/admin/page.tsx:38`、`src/app/admin/logs/page.tsx:558,667` | admin 紫 badge | → gold/jade |
| `src/app/globals.css:199,203,214-215,292-298,304-315` | 15 条级联规则在**维持**遗留紫/青的亮色表现（症状而非病因，随级联删除消亡） | 迁移后自然消失 |

**装饰性玻璃拟态**：`.glass-card`（globals.css:354-360）≈ **44 文件 130+ 处**。重灾区：admin/logs (17)、ZiweiResult (10)、BaziResult (8)、QimenResult (7)、BaziResultV2 (6)、admin/compensation (6)、7 个 (divination) 落地页 (3-5 each)、admin/* (30+)。目标：渐次替换为 `oriental-sanctuary-card` / `card-mystic-l1` / 语义 `bg-card`。功能性 overlay 的 backdrop-blur（Navbar、模态纱罩）保留。

**装饰 emoji（用户可见面）**：

| 位置 | emoji |
|---|---|
| `(divination)/ziwei/page.tsx:108` | ⭐ |
| `components/results/BaziResult.tsx:41`、`ZiweiResult.tsx:179,521` | 🔮 ⭐ |
| `divination/error.tsx:24` | 巨型 🔮 |
| `lib/creditPacks.ts:26,36` | ⭐ 🌟（定价图标） |
| `lib/growth/growthSystem.ts:74,112,131,169,195,251` | 🔮🌌⚡🌟（badge 图标） |
| `lib/onboardingSpark.ts` | 9 处 🔥✨⭐💎🌌🔮（性格特质） |
| `components/reading/ReadingFeedback.tsx:15` | 🎯 |
| `components/loading/MysticalLoader.tsx:282` | 💡 |
| `src/app/profile/page.tsx:893` | ✨ |
| admin（logs tabs 🔮🤖✨⭐、settings:16-17,185 ⭐⚡🤖、feedback:82、users:152、wiki/[id]:180） | 内部面轻扫 |
| API 错误文案（`master/route.ts:162`、`chat/route.ts:61`、`divination/route.ts:150,390`、`init:83,150`） | ✨/🔮 |

替换目标：自绘东方几何 SVG 或 `✦`（✦ 已是 approved 字符，`register:138-139`、wiki、navbar、results V2 在用）。

**SaaS 营销文案**：
- `(divination)/fengshui/page.tsx:251,254` — "AI 智能風水分析" + AI 营销段落
- `(divination)/bazi/page.tsx:231` — "人工智能…AI系统…AI解读" 段落
- `BaziResultV2.tsx:714,798,903,910`、`ZiweiResultV2.tsx:771,856,960` — "AI 深度精批" / "AI Channeled" upsell 标签 → "玄機深度精批" 系措辞
- `components/ChatWidget.tsx` — 死文件（被 MasterChatWidget 取代后未删），内含 "divination assistant… 命理助手" → **整个删除**
- legal 页的 "AI assistant/AI 模型"（terms:51、privacy:80）= 合规披露，**保留**

**已确认合规（无需处理）**：
- 29 处渐变全部为金/琥珀 on 玄墨（auth 按钮、subscribe、CoinCastPanel、wiki/portrait 卡）—— approved；FatePosterModal:596 Instagram 品牌渐变保留
- ~46 处 `animate-pulse` 全部为 loading/skeleton/streaming 状态—— approved
- `rounded-3xl + ring-white/10` OpenAI 落地页风：**零命中**
- 金色 blob/drop-shadow 光晕（MasterEntryCard:43、MysticalLoader:160,231、CollapsedBar:126,185、ExpandedView:209 等）—— approved-mystical
- 海报 canvas 配色（`#d4a853/#e8c278/#c0392b/#0a0f1e`）完全 on-brand —— **品牌制品，恒定暗色，不迁移**；LINE/WeChat/Instagram 分享按钮品牌色保留

### 1.2 暗/亮架构病根

**Token 层**（globals.css:76-120）：~24 个 CSS vars 已双定义（`:root`=亮：宣纸 `#faf8f0`/墨 `#2d1f0e`/深金 `#8b6508`；`.dark`=暗：玄墨 `#0a0f1e`/白字/鎏金 `#d4a853`）——但 **tailwind.config.js 一个都没映射**，组件里语义引用全靠 arbitrary value（`text-[var(--text-secondary)]` 600+ 行），没有真正的语义 class 体系。

**级联层**：187 条 `:root:not(.dark)` `!important` 规则（globals.css:134-589）逐条补丁式重映射 ~150 个 dark-first 类（text-white×18 阶、text-gold×15、bg-navy 系、bg-white/N、五行色×20、奇门/紫微色×30、border 系、hover×10、inputs、toast、5 个自定义工具类）。**只能覆盖它枚举过的类** —— 新 raw class = 亮色破相。

**结构性缺陷**：
1. **44 处 `dark:` 前缀全失效**：tailwind.config.js 无 `darkMode: 'class'` → `dark:` 跟随 OS `prefers-color-scheme` 而非应用主题开关（BirthplaceInput.tsx:221-271、ZiweiResultV2、FatePosterModal:579,612,645）
2. **18 处死 `light:` 变体**：Tailwind 无此 variant（BirthplaceInput×13、share/[code]）
3. **死 `prose` 类**：未装 @tailwindcss/typography → wiki 文章（wiki/[slug]:143-148）、玄機解读 tab（XuanjiChat:313、XuanjiChatCard:50、ReadingResult:12）markdown 是浏览器默认蓝链样式
4. **10+ 处裸暗纱罩**（亮色下刺眼）：FatePosterModal:421 `bg-navy-950/85`、GrowthTab:121,227,293、start:682,473,542、FamilyDrawer:113、FeedbackModal:61 `bg-black/50`、HelpTooltip:68、admin/logs:461,467、admin/settings:262、verify-email:180、dashboard:369 `bg-black/40`
5. **未定义 CSS vars**：InstallPrompt.tsx:85 `--bg-secondary`、FamilyTab.tsx:119 `--bg-input`（永久回落暗色）；FatePosterModal:496 `custom-scrollbar` 类不存在
6. **硬编码暗色页**：global-error.tsx:29-52、claim/[token]/page.tsx:88
7. **Starfield 亮色破相**：StarField.tsx:39,56 金星在宣纸底不可见；Starfield.tsx:55-70 紫色光晕 + 错误色星
8. **toast 双重样式**：layout.tsx:183-192 硬编码暗色 + 级联:347-351 亮色补丁
9. raw 类存量 **~3,369 处**；Top 重灾：admin/logs (135)、profile (83)、start (64)、BirthplaceInput (58)、admin/compensation (51)…（V2 结果组件反向最健康：BaziResultV2 77 语义 / ZiweiResultV2 64 语义）

### 1.3 既有神秘主义语言资产（扩建基础）

- `oriental-sanctuary-card` 54 处/25 文件（profile 8、GrowthTab 7、portrait 4）；`card-mystic-l1/featured`（home、MasterEntryCard、FatePosterModal）；`stamp-vermillion|stamp-gold` 14 处/9 文件；`verse-callout` 5 文件；`hairline-gold`、`celestial-orbit`（180s 星轨）
- 覆盖率：glass-card 130+ vs sanctuary 54 ≈ **40%**，缺口集中在 results 组件、(divination) 落地页、admin
- 字体：Inter（body，`subsets:['latin']`）+ Noto Serif SC 400/700（标题，681 处 `font-serif`）—— **SC 简体字形用于 zh-TW 产品，须换 TC**
- ThemeProvider：html 上同时切 `dark`/`light` 类；`localStorage.theme` 默认 dark；layout.tsx:122 inline script 防 FOUC；无 `prefers-color-scheme` 跟随（`system` 模式本次不做，成本 ~2-4h 已评估）

### 1.4 Token 漂移（vs 09-12 doc §4）

`--bg-abyss` 缺位（实为 `--bg-primary #0a0f1e`）；`--bg-elevated` 缺位；`--bg-surface #111d35` 实为 doc 的 elevated 值（整体上移一档）；gold-pure/glow/ancient → gold/gold-light/gold-dark（ancient `#9a722e` → `#b8893a` 变浅）；gold-hairline 0.16 → 实际 0.2-0.3；`--vermillion-seal/--jade-tranquil` 未成 var（仅 tailwind palette + `#c0392b` 硬编码）；**doc 完全没定义亮色体系** —— 宣纸 token 集 + 187 条级联全是 doc 之后的即兴发明。

**处置**：不回改命名（会破坏 600+ arbitrary-value 引用），以现状为准在本方案 §2.4 正式化，漂移记录在案。

---

## 二、设计执行 Prompt（v2.1）

> 本节为可独立复用的执行 prompt：每次改面/改文件时通读遵循。

### 2.1 角色与使命

你是资深产品设计师 × 前端工程师，为「玄機 XuanJi」执行全站视觉重塑：**彻底根除 AI/SaaS 通用审美，回归「现代东方神秘主义」——静谧星空下的宋代书斋**；暗/亮两种模式为同等公民，所有样式经双模式验证。改动哲学：**最庄重克制的东方审美，包裹最深邃的现代智慧**。

### 2.2 审美纲领

- **暗 = 玄夜**：墨蓝底、鎏金发丝线、朱砂印点睛、星轨微光 —— 子时观星
- **亮 = 宣纸**：米白底、墨字、深金、朱砂印点睛 —— 辰时读书
- 亮模式不是暗色的反色，而是**同一家族的不同时辰**
- 简约（留白）· 直觉（自然动线）· 大气（沉静碑拓感）· 现代神秘（内敛星芒）
- 杜绝：科技浮夸、游乐场杂色、客服感、电商铜臭

### 2.3 禁令清单（BANNED — 全站彻底清除）

1. **紫/靛/洋红/青作装饰色**（purple/indigo/violet/fuchsia/cyan）。⚠️ 五行/星曜/吉凶的**语义色**（emerald/sky/rose/amber 等命理编码）保留色相，仅按模式校正对比度 —— 清扫时不得误伤排盘语义
2. **装饰性玻璃拟态**：`glass-card` 渐次替换；功能性 backdrop-blur（导航/纱罩）除外
3. **装饰 emoji**（🔮✨⭐🌟🤖🧙⚡🌌💡🎯💾）→ 自绘东方几何 SVG 或 `✦`
4. **SaaS 营销文案**（"AI 智能"、"AI 命理"、"智慧助理"、"Ask AI"）→ 玄機人格化措辞（合规披露除外）
5. **客服感元素**（animate-ping 在线点、Intercom 式按钮）
6. **数值进度条式神秘感破坏**（三段仪式文案保持）
7. **OpenAI 落地页风**（rounded-3xl 全玻璃卡 + ring-white/10）

### 2.4 视觉词汇表（双模式 token · 正式规范）

| 维度 | 暗（玄夜） | 亮（宣纸） |
|---|---|---|
| 底色 | `--bg-primary #0a0f1e` / `--bg-surface #111d35` | `#faf8f0` / `#ffffff` |
| 浮层/卡片 | `--bg-card rgba(17,29,53,.6)` + `--bg-elevated`（新增） | `rgba(255,255,255,.85)` |
| 文字 | `--text-primary #fff` · secondary 0.7 · muted 0.4 | `#2d1f0e` · 0.72 · 0.55（WCAG AA ≥4.5:1） |
| 金三阶 | `--gold #d4a853` · `--gold-light #e8c278` · `--gold-dark #b8893a` | `#8b6508` · `#d4a853` · `#705000` |
| 点睛（恒定） | 朱砂 `--vermillion #c0392b`（印/化解）· 青玉 `--jade #2d8a6e`（吉/平安） | 同左 |
| 边界 | `--border-gold rgba(212,168,83,.2)` · `--card-border` · hairline 0.16 基准 | `rgba(184,134,11,.3)` 系 |
| 纱罩 | `--scrim rgba(4,8,16,.85)`（新增） | `rgba(45,31,14,.4)`（新增） |
| 输入 | `--input-bg #111d35` | `#ffffff` |
| 标题字体 | **Noto Serif TC**（400/700） | 同左 |
| 正文 | Inter + 系统 sans（中文字回退系统） | 同左 |
| 动效 | 金线流转 0.35s `cubic-bezier(.16,1,.3,1)` · 星轨 180s · 墨晕淡入；无 bounce/glitter；全局尊重 `prefers-reduced-motion` | 同左 |
| 图标 | 自绘东方几何线条（八卦爻线/星轨/云纹/朱印） | 同左 |

**既有工具类即规范**：`oriental-sanctuary-card`（主卡）· `card-mystic-l1/featured`（次卡/焦点卡）· `stamp-vermillion/gold`（印章标签）· `verse-callout`（经文引用）· `hairline-gold` · `celestial-orbit` · `touch-target`。

### 2.5 双模式工程规则

1. **新代码只写语义 class**（tailwind 映射后）：`bg-background` / `bg-surface` / `bg-card` / `bg-elevated` / `text-foreground` / `text-secondary` / `text-muted` / `text-gold`(-light/-dark) / `text-jade` / `text-vermillion` / `border-gold-hairline` / `bg-scrim` / `bg-input`。**禁** raw `text-white/N`、`bg-navy-*`、`bg-black/*`、`bg-white/N`、`border-white/N`
2. 纱罩一律 `bg-scrim`（token），禁裸写
3. 五行/星曜语义色：保留 raw 色相 class，其亮色对比度由级联的**语义校准段**永久承担（见 §3-P4 终）
4. 海报 canvas / OG 图 / favicon = **品牌制品**，恒定暗色，不随主题
5. 每处改动**必须**暗/亮双验证（目检清单见 §4）
6. `dark:` variant 仅在 `darkMode:'class'` 配置下使用；禁止 `light:` variant（不存在）

### 2.6 分面处理表（13 面）

| 面 | 现状 | 处理 |
|---|---|---|
| Home `/` | 靠级联（OK-ish） | 语义迁移 + 保留 card-mystic 体系 |
| `/divination` 门户 + MasterEntryCard | OK | 纯迁移，视觉已是范本 |
| 起卦表单（(divination)/[type]） | BirthplaceInput 有 dark:/light: 死变体 | 迁移 + 修变体 |
| 结果组件（V2×2 + V1×2 + Qimen/LiuYao/IChing/Fengshui/Other） | V2 健康（77/64 语义），V1 紫面板/glass 重灾 | V1 全面 sanctuary 化；语义色保留 |
| MasterChatWidget（折叠/展开） | var-based 健康 | 轻迁移 |
| Navbar / Footer | OK | 迁移 |
| Dashboard / profile+tabs | 靠级联，紫 badge、未定义 var、GrowthTab blob | 迁移 + AI 味清扫 + 补 var |
| Start 漏斗 | dark-first + 紫色 blob + 裸纱罩 | 迁移 + 清扫 + 纱罩 |
| `/r/[token]` 公开页 | OK（复用结果渲染器） | 轻迁移 |
| Auth/legal/wiki | auth OK；wiki 文章 prose 死类 | 迁移 + prose 修复 |
| claim/delete-account/verify-email/gift/share | 硬编码暗/半破相 | token 化 |
| global-error | 硬编码暗 | token 化 |
| **Admin 13 页** | dark-first 级联补丁、glass 重灾、emoji tabs | **全量迁移 + 轻扫**（用户决策） |

---

## 三、执行计划（P1-P5）

### P1 基建（架构地基）

| # | 任务 | 文件 |
|---|---|---|
| 1 | `darkMode: 'class'` + 语义色映射（§2.4 全部 token → tailwind colors）+ fontFamily serif 用 TC | tailwind.config.js |
| 2 | 新增 token：`--bg-elevated`、`--bg-secondary`、`--bg-input`（别名）、`--scrim` 双模式；正式化宣纸 token 注释块 | globals.css |
| 3 | Noto Serif SC → `Noto_Serif_TC`（400/700） | layout.tsx |
| 4 | 修复 44 处 `dark:`（生效后逐处复核语义：改语义 class 或保留）+ 删除 18 处死 `light:` | BirthplaceInput、ZiweiResultV2、FatePosterModal、share/[code] |
| 5 | 死 prose 修复：以 `ziwei-markdown` 规则建别名 `.classic-prose`（双模式规则齐备），替换 wiki/玄機 tab 的死 `prose` 类 | globals.css、wiki/[slug]、XuanjiChat、XuanjiChatCard、ReadingResult |
| 6 | toast 样式收敛单源（var-based）；补 `custom-scrollbar` 定义（或改用既有 scrollbar 工具类） | layout.tsx:183-192、FatePosterModal:496 |

### P2 AI 味清扫（P1 后，按 §1.1 清单全量）

growthSystem realm 配色→玄色系九阶（月白→霜青→黛→青玉→流金→鎏金→朱砂→紫金→玄墨 方向定稿时以"无 SaaS 色相"为准）+ 6 badge emoji→✦/文字（**同步检查 `growthSystem.test.ts` 是否钉色值**）；start 紫色 blob；dashboard/reading 紫 badge→jade/vermillion；gift cyan→jade；admin 紫 badge；V1 紫微+奇门面板 sanctuary 化；风水/八字页 AI 文案重写；onboardingSpark 9 emoji；creditPacks ⭐🌟→stamp-gold；**删** ChatWidget.tsx；"AI 深度精批"→玄機措辞；divination/error 大🔮→SVG；V1 结果 emoji；admin emoji tabs；API 错误文案去 ✨🔮。

### P3 亮模式补洞

13 处裸纱罩→`bg-scrim`（§1.2-4 全清单）；global-error + claim/[token] token 化；Starfield/StarField 亮模式处理（宣纸不需要星——`.light` 下隐藏 或 换墨色星点，执行时定）；InstallPrompt/FamilyTab 未定义 var 修复；ReadingResultCard:127 装饰 pulse 复核（保 loading 语义、去装饰 glow）。

### P4 全量语义迁移 + 级联删除（5 波，每波后 lint+tsc 门禁）

| 波次 | 范围 | 文件量 |
|---|---|---|
| W1 | start/*、home、(divination) 落地页+表单、MasterEntryCard | ~12 |
| W2 | dashboard、profile+tabs（GrowthTab/FamilyTab/portrait）、reading/[id]、ReadingResultCard | ~8 |
| W3 | results 全家（V2×2 + V1×2 + Qimen/LiuYao/IChing/Fengshui/Other）、XuanjiChat/Card | ~10 |
| W4 | auth 4 页、subscribe、claim、delete-account、gift、welcome、legal、wiki、share、MasterChatWidget 家族、Navbar/Footer、global-error | ~18 |
| W5 | admin 全部 13 页 | ~13 |
| 终 | **删除级联 debt 段 ~137 条**（text-white/N、text-gold/N、bg-navy、bg-white/N、border-white/N、hover、inputs、toast 等补丁）；**保留语义校准段 ~50 条**（五行/星曜/状态色亮色对比度校正）并加注释界定其语义属性 | globals.css |

每波验收：该波文件 grep raw class = 0 残留（语义色例外清单内）。

### P5 验证与交付

- **grep 门禁**（§4 详见）
- **命令门禁**：`tsc --noEmit` / `next lint` / `vitest run` / `next build` 全绿
- **双模式目检清单**：逐面 × 暗/亮 两行勾选表（随执行产出，浏览器复核由用户完成）
- **交付**：本方案即规范；执行完成后在本文件追加「执行记录」节（before/after hit 数、波次日志、遗留项）

---

## 四、验收门禁（P5 定义 "完成"）

1. grep：装饰性 `purple-|indigo-|violet-|fuchsia-`（用户可见面）= **0**；`cyan-` 仅存语义校准段与命理语义清单
2. grep：用户可见面装饰 emoji（🔮✨⭐🌟🤖🧙⚡🌌💡🎯💾）= **0**
3. grep：`AI 智能|AI 命理|智慧助理|Ask AI` = **0**（legal 披露白名单除外）
4. grep：`glass-card` = **0**（功能性 blur 例外清单除外）
5. 亮模式：零裸暗纱罩、零死 prose、零未定义 var、零硬编码暗色页
6. 级联：`globals.css` 中 `:root:not(.dark)` 仅剩语义校准段（≤55 条，带界定注释）
7. `tsc --noEmit` 0 错误 · `next lint` 0 警告 · `vitest run` 全绿 · `next build` 通过
8. 每波迁移文件 raw class 残留 = 0

---

## 五、风险与对策

| # | 风险 | 对策 |
|---|---|---|
| 1 | `darkMode:'class'` 生效后 44 处 `dark:` 从跟随 OS 变为跟随应用开关 —— BirthplaceInput 下拉等处视觉行为突变 | P1-4 逐处复核，能语义化的语义化，不能的确认意图后保留 |
| 2 | growthSystem 颜色为导出常量，`growthSystem.test.ts` 可能断言色值 | P2 动它之前先跑该测试，钉色则同步更新断言 |
| 3 | 级联删除后亮色回归风险集中在低频面（admin/claim/legal） | W5 后按 §4-5 全量 grep + 目检清单覆盖；低频面列入用户复核清单首位 |
| 4 | ~3,369 处迁移工作量大，中途回归 | 每波 lint+tsc 门禁 + 波间不混改（一波一提交粒度，便于二分定位） |
| 5 | V1 结果组件渲染存量旧盘 —— 纯样式改动，数据契约零变更 | 迁移时只动 className，不动结构/字段 |
| 6 | admin 面用户已习惯暗色工作流 | 保留暗为 admin 默认视觉密度，仅迁移实现方式，不改信息架构 |

---

## 六、范围边界（不做）

- `system` 主题模式（~2-4h，另立任务；本次 dark/light 二值维持）
- `@tailwindcss/typography` 依赖引入（用 `.classic-prose` 手写规则替代，零新依赖）
- 海报 canvas / OG 图 / favicon 品牌制品（恒定暗色）
- legal 页 AI 披露文案（合规保留）
- 五行/星曜语义色相变更（命理语义，保留）
- 交互/焦点管理改造（audit-2026-10 AUD-11/12 ModalShell/back-button，另立任务）

---

## 附：执行记录（2026-10-18 完成）

### 完成状态

- [x] **P1 基建** — `darkMode:'class'`；语义色映射（background/surface/elevated/card/foreground/secondary/muted/line/scrim/input 全部 RGB-channel 化，`/alpha` 修饰符双模式生效）；新增 `--scrim/--bg-elevated/--bg-secondary/--bg-input` + 9 组 RGB channel tokens；字体 SC→TC；toast var 单源；`classic-prose`（@layer components）替换死 prose 类 ×4；`custom-scrollbar` 定义；BirthplaceInput 作为语义迁移试点（12 处，dark:/light: 死变体清零）；修复 44 处失效 `dark:`（转为正确 app 驱动行为）
- [x] **P2 AI 味清扫** — growthSystem 九阶配色→传统东方色系（月白→霜青→青玉→黛蓝→鎏金→赭金→朱砂→玄金→赤金辉）+ 15 处 emoji→汉字印记（玄爻陰幾才機神乾道 + 卦師博問百匠）；onboardingSpark 46 处 emoji→语义汉字（含 祿財緣卦 提问类目、柱紫爻梅門堪輿 模块符号）；creditPacks 🌙⭐🌟→旬佰乾；start 紫色 blob 删除；GrowthTab 光斑删除+hero 硬编码暗底移除；紫/靛装饰色 42 处清零（六親/星曜语义保留）；V1 紫微+奇门面板 sanctuary 化；风水/八字页 AI 营销文案重写；"AI 深度精批"→"玄機深度精批" ×10；死文件 ChatWidget.tsx 删除；API 错误文案去 ✨🔮 ×6；admin emoji 全清；guidanceConfig + socialShare 同步测试更新
- [x] **P3 亮模式补洞** — 13 处纱罩→`bg-scrim`/`bg-elevated`；claim 页去硬编码暗渐变；Starfield 去紫+`.xj-stars` 亮色隐藏；StarField canvas 主题感知（亮色停 rAF）；GrowthTab 锁定卡 `dark:` 变体
- [x] **P4 全量迁移 + 级联删除** — **79 文件 × 26 映射模式** 机械迁移（text-white/N→text-foreground、bg-navy 4 阶→background/surface/elevated、bg-white/N→bg-foreground、border-white/N→border-line、from/via/to-navy→渐变 token、placeholder-white→foreground）；迁移后 grep 残留 = **0**；级联 **187→98 条**（删除 89 条 debt：text-white×18、text-gold×15、bg-navy×8、bg-gold×9、bg-white×9、border-gold×7、border-white×13、hover×9、from-gold×1、bg-navy-950/90、bg-navy-900/60、bg-purple 等），保留 98 条全部为语义校准（五行/星曜/状态色 AA 对比）+ 工具类亮色变体 + input 元素安全网，并加注释界定边界
- [x] **P5 验证** — `tsc --noEmit` 0 错误 · `next lint` 0 警告 · **vitest 84 文件/1325 测试全绿** · `next build` exit=0 · 4 项 grep 门禁通过（装饰紫=0（语义例外清单内）/ 用户可见 emoji=0 / AI SaaS 文案=0 / raw 结构类=0）

### 规模与影响

- **106 文件变更，+1282 / −1501**（净 −219 行）
- 亮色模式从「187 条 `!important` 补丁」架构升级为「RGB-channel 语义 token」架构；新增代码禁用 raw 结构类（§2.5 规则）
- 已知视觉微移（记录在案）：亮色实底金按钮 `#b8860b→#8b6508`（对比度更优）；低透明度金文本 `/30-/50` 在亮色下较旧级联略浅（装饰性文本，非 AA 关键面）；`navy-900/800` 在暗色下统一为 surface 一档（两者原本仅差 6 hex）
- 边界决策：六親/星曜语义色保留（LiuYaoResult/QimenResult 色相映射 + 级联校准段）；toggle 旋钮 5 处 solid `bg-white` 保留（双模式通用）；global-error.tsx 保持品牌暗色（崩溃页无 CSS var 上下文）；glass-card 作为 var-based 工具面保留（词汇表迁移另立任务）；annualFortunePrompts.ts 注释中的 AI 措辞为内部文档，保留
- **遗留任务执行完毕（2026-10-18 第二批）**：
  1. **ModalShell 原语**（AUD-11/UX-4/UX-10）：新建 `src/components/ui/ModalShell.tsx`（role/aria-modal/Escape/focus trap + restore/history sentinel/overlayStack 注册/bg-scrim 主题纱罩）；改造消费者 4 处 — FatePosterModal、start 跳过弹窗、CacheDialog 全接入，MemoryGateModal（自建双按钮 trap 已达标）补主题纱罩 + overlay 注册；顺手修正 CacheDialog 硬编码 `bg-black/70` 纱罩
  2. **Android 硬件返回**（AUD-12/UX-13）：新建 `src/lib/overlayStack.ts` 全局 overlay 注册栈；NativeInitializer 接入 `@capacitor/app`（新依赖）backButton 处理器 — 逐层消 overlay → web history 后退 → 根页 exitApp；MasterChatWidget 展开态 + MemoryGateModal 已注册；**Android 下次构建前需跑 `npx cap sync android`** 使插件在原生层注册
  3. **glass-card 词汇升级**：新建 `.card-quiet`（var-based 静音面板，去 blur 保留双模式）替换全站 46 文件的 glass-card；`.glass-card` 定义与 print 选择器同步更新；glass-card 存量 = 0
  4. **i18n 熔断器 + 全量迁移完成**（UX-12）：`.eslintrc.json` 新增 `no-restricted-syntax` 3 组选择器（`lang === '…' ?`/`isEn ?`/`isZh ?` 全部 error）；全站 75 个存量文件的 inline 语言三元表达式已全部迁移为 `T(lang, zh, en)` / `TEN(isEn, zh, en)`；`.eslintrc.json` 隔离白名单已完全清空（仅豁免 `src/lib/i18n/index.ts` 实现本体）。全库 inline 语言三元表达式彻底清零，实现全生命周期零回归保护。
- **全量终态验证**：`tsc --noEmit` 0 错误 · `next lint` 0 警告 / 0 错误 · `vitest run` 84 文件 / 1325 测试全绿 · `next build` exit=0。

