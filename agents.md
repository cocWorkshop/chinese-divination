# AGENTS.md — AI 协作与工程纪律规范

本文件面向所有在本项目中工作的 AI 智能体（Agent）及开发者，规定开发、测试、故障排查与交付的标准作业程序（SOP）。

---

## 核心铁律：所有问题必须落实到用例（Issue-to-Test Imperative）

> **「任何 Bug 的修复、特性的增加或交互的重构，都必须且必须伴随对应的自动化测试用例，严禁只修代码不写用例。」**

1. **红绿重构与回归锁（Regression Locking）**：
   - 发现逻辑缺陷、自然语言对话异常、状态丢失或崩溃时，第一步先编写/定位能够复现该问题的测试用例。
   - 修复后，运行测试确保新用例由红变绿，且原有所有测试全量通过。
2. **严防“隐性复发”**：
   - 如果某个问题发生过一次（例如：大师对话生硬说再见、Reading 页面重复显示问答卡片、开发服务器因构建缓存踩踏报 500 等），必须在自动化测试或脚本中建立长期看门狗（Watchdog）。
3. **交付四道质量门禁（Quality Gates）**：
   在向用户报告完成或提交代码前，必须在主线程依次通过：
   - `npx tsc --noEmit` $\rightarrow$ 必须 0 错误
   - `npx eslint src` $\rightarrow$ 必须 0 警告、0 错误
   - `npx vitest run` $\rightarrow$ 全部测试用例（含新增用例）100% 通过
   - 冒烟/构建状态检测 $\rightarrow$ 核心路由响应正常（无 500、无模块解析丢失）

---

## 事故复盘与防御机制：Dev Server 与 Next.js 构建缓存冲突

### 1. 事故现象
开发服务器报错白屏：
```text
Error: Cannot find module './vendor-chunks/framer-motion.js'
Require stack:
- .next/server/webpack-runtime.js
- .next/server/app/reading/[id]/page.js
500 Internal Server Error
```

### 2. 根本原因（Root Cause）
* 本地后台正在运行 `npm run dev`（监听 8088 端口），Next.js 的开发环境 Webpack 编译器在内存中维系着指向 `.next/server/vendor-chunks/` 的依赖图。
* Agent 为了验证构建正确性，在同目录下并发执行了 `npm run build`（`next build`）。
* `next build` 会在第一步清空并重写 `.next` 为生产制品，将开发期的 vendor-chunks 全部擦除。
* 常驻后台的 `next dev` 进程并不知道底层文件被清空，后续浏览器发送请求时，试图加载已不存在的文件，导致全站报 500 崩溃。

### 3. 预防与自愈守则（Operational SOP）
* **禁止盲目并发构建**：如果本地 8088 端口有 `next dev` 在运行，原则上优先依靠 TypeScript、ESLint 和 Vitest 测试套件做快速验证。
* **构建后的自动自愈（Auto-Healing）**：
  若确实运行了 `next build` 覆盖了共享产物，必须立即执行自愈三步法：
  ```powershell
  # 1. 终止残留旧缓存的 node 进程
  Stop-Process -Name node -Force -ErrorAction SilentlyContinue
  # 2. 清理受污染的 .next 目录
  Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
  # 3. 重新拉起干净独立的开发服务器
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WindowStyle Hidden
  ```
* **自动化防御用例**：
  在 [`src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts`](file:///c:/Users/DaZWe/Developer/chinese-divination-dev/src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts) 中对关键依赖导入、组件导出签名及缓存规则进行自动化监测。

---

## 业务模块测试归档清单（近期核心改动）

| 业务场景 | 对应核心代码 | 必须运行的守护测试用例 |
| :--- | :--- | :--- |
| **玄机大师收尾：自然收尾与闲置反思静默** | `divination-refs/master.md`<br>`reflection.md`<br>`src/lib/master/turnEngine.ts` | `src/lib/master/__tests__/turnEngine.test.ts`<br>验证 `isPassReply('[PASS]')` 正确识别，闲置反思静默丢弃不吐生硬告别词。 |
| **玄机大师收尾：会话预算与上限提醒** | `src/lib/master/systemPrompt/buildSystemPrompt.ts`<br>`src/components/master/widget/MessageBubble.tsx` | `src/lib/master/systemPrompt/__tests__/buildSystemPrompt.test.ts`<br>验证剩余 $\le 5$ 轮时注入收拢指令，硬限制时渲染系统级 `limit_notice` 卡片。 |
| **Reading 页面：大师接管与上下文注入** | `src/components/results/XuanjiChatCard.tsx`<br>`src/components/master/MasterChatContext.tsx`<br>`src/app/api/master/route.ts` | `src/components/results/__tests__/xuanjiChatCardLogic.test.ts`<br>验证登录状态下隐藏旧问答卡片，自动注册 `viewingReadingId` 并带入大师上下文。 |
| **情境追问：LLM 动态生成与排盘关联** | `src/components/reading/InContextMasterPrompt.tsx`<br>`src/components/ReadingResultCard.tsx`<br>`src/components/master/widget/ExpandedView.tsx` | `src/components/reading/__tests__/InContextMasterPrompt.test.ts`<br>`src/components/master/__tests__/expandedViewLogic.test.ts`<br>验证动态优先解析排盘生成的 `suggestedQuestions`，复制按钮繁体「完成」文案。 |
| **激活与反思：防重复打扰与静默机制** | `src/lib/master/activationDetect.ts`<br>`src/components/master/MasterChatContext.tsx`<br>`src/lib/master/turnEngine.ts` | `src/lib/master/__tests__/activationDetect.test.ts`<br>`src/lib/master/__tests__/turnEngine.test.ts`<br>验证已随访过的 CTA 不再重复追问，`ambiguous_resume` 找不到话头时回复 `[PASS]` 静默丢弃。 |
| **运行时完整性与依赖解析** | 全局 UI 依赖与组件导出 | `src/__tests__/smoke/buildIntegrityAndRuntimeGuard.test.ts`<br>验证关键模块解析，防止缺少导出或编译图失效。 |

---

## 国际化与代码禁忌

1. **国际化断路器（i18n Circuit Breaker）**：
   - 严禁在代码中写行内三元语言判断（如 `lang === 'en' ? en : zh` 或 `isEn ? en : zh`）。
   - 必须使用 `T(lang, zhTW, en)` 或 `TEN(isEn, zhTW, en)`。
   - **严格注意参数顺序**：第 2 参数必须为中文（繁体），第 3 参数必须为英文。
2. **Token 与样式**：
   - 严禁引入 SaaS / AI 刻板视觉（紫蓝色大渐变模糊球、无意义 emoji 表情 🔮✨⭐🤖）。
   - 严格采用东方玄学隐奢沉静风格，使用 `var(--gold)`、`var(--card-bg)`、`card-quiet`、`oriental-sanctuary-card` 等语义 Token。
