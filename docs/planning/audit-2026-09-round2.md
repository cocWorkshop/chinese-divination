# 深度审计第二轮 — 执行报告与延后项（2026-09-12）

> 分支 `refactor/audit-optimization`。第一轮（rateLimiter 内存泄漏、admin 守卫、CI 门禁、
> ziweiCalculator 70x 提速、覆盖率工具、遗留清理）见前一提交。本轮为全量深挖：
> 数据库层 / 安全 / LLM 与流式基础设施 三条并行审计线的落地结果。

## 一、已执行的优化（全部基于现有功能，无行为面新增）

### A. 计费正确性 — 竞态修复（money path）

| # | 问题 | 修复 | 文件 |
|---|---|---|---|
| A1 | `/api/start/complete` 无条件 `user.update`，并发提交双发注册奖励 | `updateMany({ where: { tentative: true } })` 单发转换 | start/complete/route.ts |
| A2 | gift 领取：`claimCount >= maxClaims` 在事务外，最后一席可被不同用户并发超额领取 | 事务内受保护 `updateMany`（claimCount < maxClaims 才 +1）；同用户双击由唯一约束 P2002 整体回滚 | gift/[code]/route.ts |
| A3 | register 推荐奖励双发（`shareLink.update` 无 `used:false` 守卫） | 条件 `updateMany`，竞态失败方不发奖 | register/route.ts |
| A4 | `markFailed` 置 failed 与退回积分两步分离 — 进程崩溃其间则退款永久丢失（sweeper 只扫 pending） | status 置位 + `refundHold` 单事务（refundHold 接受 tx 参数） | lib/readings/lifecycle.ts |
| A5 | divination/init：先扣持积分再建 pending 行，崩溃其间 = 扣款无行可退；补偿退款无 CreditLog | 新 `holdCreditsAndCreateReading()`：守卫扣减 + 建行 + 账本记录同一事务/提交序 | lib/creditService.ts + init/route.ts |
| A6 | master 首轮并发两个请求 → `MasterSession.create` P2002 → 500 | `upsert` | master/route.ts |

### B. 安全

| # | 问题 | 修复 |
|---|---|---|
| B1 | `/api/resend-verification`：未认证枚举 oracle（check 模式 + 三分支差异化响应）+ 无限流 → 邮件轰炸 | 删除 check 分支（前端无调用方）；三分支统一 generic 响应；3/小时/IP 限流 |
| B2 | `/api/auth/login` 预检路由 `!user` 分支无 bcrypt 恒时化（与 NextAuth authorize 不一致） | `dummyBcryptCompare()` 补齐（从 lib/auth.ts 导出） |
| B3 | feedback 路由把 `err.message`（Prisma 内部）回给客户端 | 通用错误 + 服务端日志；feedback 字段 2000 字符上限 |
| B4 | divination/init + 主路由：`inputData` 无上限无类型校验直接入库 + 进 LLM prompt（Route Handler 无 bodySizeLimit） | 共享 `_inputValidation.ts`：20KB 上限、object 校验、language 白名单、question 类型校验 |
| B5 | chat `history` 逐条未校验：单条 content 可达数 MB、可注入 `system` role | 逐条 role/content 校验（user/assistant、4000 字符/条） |
| B6 | `newFamilyMember` 字段无上限（与 family-members 路由 Zod 不一致） | name/relation/relationDetail 统一 100/50/100 |
| B7 | 公开分享端点返回原始 `inputData`（含经纬度、精确时刻等超出展示需要的出生 PII） | 响应剔除 inputData（保留服务端派生的 birthInfo）；分享页确认无消费方 |
| B8 | notifications/[id]/read：任意 id → FK 违约裸 500 | try/catch → 404 |
| B9 | `_birthProfile` 出生 PII 打 stdout | 移除 |
| B10 | credits/history 分页参数无界（limit=1e6、负 page → 500） | clamp 1-100 / ≥1 |

### C. 数据库（迁移 `20260912132044_add_missing_indexes`，第 34 个）

| 索引 | 依据 |
|---|---|
| `Reading(familyMemberId)` | chat/divination-check 按成员过滤 + `ON DELETE SET NULL` 级联（PG 不自动建 FK 索引） |
| `Reading(status, createdAt)` | stale sweeper 每 10 分钟 `status='pending'` 扫描此前走全表 seq scan |
| `CreditLog(userId, createdAt)` | credits/history 与 admin credit-logs 的过滤+排序+深分页 |

冗余索引（未动，仅记录）：`GiftLink(code)`、`Compensation(token)`、`MasterSession(userId)` 与各自 unique 重复；`RateLimit(userId,windowStart)` 是 unique 组合的前缀。

### D. 性能 / 资源

| # | 问题 | 修复 |
|---|---|---|
| D1 | `/api/readings` 无 take、全列下发（`calculationData`/`llmPrompt`/`llmRawOutput`/`chatMessages` 每行数十 KB）→ 200 条记录数 MB 响应 | select 元数据列 + take 500（前端唯一消费方 dashboard 确认只用这些字段） |
| D2 | chat 家庭成员逐个 `findFirst`（N+1） | `distinct(['familyMemberId'])` 单查询 |
| D3 | `/api/init` 每次加载 ~11 个 AdminSetting findUnique | `getCosts()` 批量 + misc 单 findMany → 3 查询 |
| D4 | admin divination-logs：时间窗无界查询 + **匹配 bug（从不比对 userId，日志归属错用户）** | 约束到本页 userId 集合 + take 1000 + 最近邻匹配 |
| D5 | 流式解读每字符一个 SSE 帧（~30K 帧 / ~3MB framing 开销每单） | 解析器按 push 缓冲（= 每 LLM delta 一帧），保留逐字打字 UX |
| D6 | master SSE 无心跳 — 首个 LLM 调用 30-90s 无字节流，默认代理 60s 读超时切断 | 15s 心跳（对齐 divination 路由） |
| D7 | 客户端断开从不中止上游 LLM 调用（signal 支持存在但零接线）→ 放弃的 master 轮次烧完 12 次 tool-loop token | divination（阻塞+流式）与 master turnEngine 全链路穿接 `req.signal` |

### E. 可靠性 / 运维

| # | 问题 | 修复 |
|---|---|---|
| E1 | 调度器 `void tick()` 无 `.catch` — 未来任一 job reject 即 unhandled rejection 崩进程 | `.catch()` 结构化 + per-job 重入防护 |
| E2 | admin settings PUT 后 LLM 配置最长 60s 才生效（缓存清理钩子存在但零调用） | 写后 `clearLLMSettingsCache()` |
| E3 | claudeProxy 错误丢失 HTTP status（永远 502） | 错误携带 `status` 字段 |
| E4 | openrouter SDK 隐式重试（默认 2 次）未配置未记录，代码注释与此矛盾 | 显式 `maxRetries: 2` + 说明（所有尝试共享同一 timeout 预算） |

## 二、⚠️ 一处需要你确认的行为变更

**D7 的 divination 部分**：此前客户端断开（网络抖动/关标签页）后，服务端会**跑完 LLM 并保存解读**（`_finalize.ts` 有意为之——"用户已付费，解读落入历史"）。现在断开会**中止 LLM 并走既有失败路径 = markFailed + 全额退回暂扣积分**。显式取消的用户体验是变好的（退款+不浪费），但"意外断线"场景从"稍后可在历史里看到解读"变成"退款+需重试"。**如你倾向旧行为，回滚 route.ts 中两处 `signal: req.signal` 即可**（master 部分无此问题：中止时不落库，且无退款路径可坏）。

## 三、测试覆盖现状

- 42 suites / **1078 tests / ~7s**（本轮审计前 91.6s；首轮已把紫微套件 140s → 2s）
- 覆盖率工具就位（`npm run test:coverage`，v8，src/lib + src/app/api 范围）：整体 ~40%
- 盲区（0-8% 覆盖，均为 money/streaming path）：`divination/route.ts`、`divination/init`、`_finalize`、`master/route.ts`、`turnEngine`、`llm/stream+complete`、`chatMessageStore`、`email.ts`。integration 套件（masterChat 25 场景 + creditReservation 并发）覆盖了部分 DB 语义，但 LLM 边界（重试、abort、解析降级）完全无自动化回归。
- 新增测试：rateLimiter（含淘汰回归）；A2/A1/A3 的竞态修复目前依赖代码审阅保障，未加并发集成测试（见延后项 T2）。

## 四、延后项 — 超出现有功能或需要你决策后再做

> 以下均已调研清楚、有明确落地方案，但涉及产品策略 / 新功能面 / 基础设施投入，**未动**。

| # | 事项 | 为什么延后 | 方案要点 |
|---|---|---|---|
| P1 | **MasterChatMessage 自动保留策略** | 删除用户数据与 GDPR 导出/审计口径交叉，保留期是政策决定 | jobs 注册 retention job：archivedAt > N 天硬删（默认建议 180d，环境变量可调） |
| P2 | **turnIndex 唯一约束** | 现存数据可能已有重复值，直接加约束会让迁移失败；写路径需 P2002 重试 | 迁移前先 `SELECT ... GROUP BY HAVING count>1` 清洗；`@@unique([userId,sessionId,turnIndex])` + 冲突重试 |
| P3 | **压缩摘要持久化** | 会话超 60K token 后每轮重付一次 summarize LLM 调用（成本税）；需要 schema + 引擎改动 | 摘要作为合成行落库（schema 注释已预留），只 summarize 新增量 |
| P4 | **Master 失败退款** | master 在流式前扣积分，LLM 失败无退款路径 — 计费策略变更（divination 有 hold/refund 语义，master 没有） | 引入 master 的失败退款或改为 hold 模式（工程量在 route 状态机） |
| P5 | **分享撤销** | 新端点（DELETE /api/readings/[id]/share 清 shareToken）；分享页此前唯一的"撤销"途径是软删整条解读 | 10 行路由 + 前端按钮 |
| P6 | **claim/[token] email 脱敏** | 补偿领取页当前向持链接者展示完整邮箱；脱敏是 UX 变更 | `u***@domain` |
| P7 | **Stripe 订阅 webhook** | 代码库无订阅销售流程（只卖一次性积分包），现在实现是处理永不触发事件的死代码；schema 的 subscription 字段是预留 | 上线订阅时再做：`customer.subscription.updated/deleted`、`invoice.payment_succeeded`、`charge.refunded` + 专用 WebhookEvent 幂等表 |
| P8 | **蓝绿/零停机部署** | 基础设施改造：需 Nginx/Caddy 前置探测或双端口实例 | deploy-local.yml 改双容器交替 + 探测切换 |
| P9 | **分布式限流（Redis）** | 当前单实例 + 内存限流器已够；多副本部署时才需要 | Upstash/自建 Redis 滑动窗口 |
| P10 | **UI 组件测试（RTL/Playwright）** | 新测试基础设施 + 41 个组件零覆盖；表单/弹窗/hydration 回归无保障 | 先从八字输入表单、支付弹窗、Master 折叠框三个关键交互开始 |
| P11 | **覆盖率门禁 ratchet** | 整体 40% 设门禁会立刻红；先有覆盖再设线 | 核心计算模块 >90% / 整体 >70%，逐步抬 |
| P12 | **LlmLog 行数自动清理** | 现在只有 90 天 PII 置空（logRetention）+ 手动 admin 清理（180 天）；行数无界增长 | logRetention job 增加硬删段（默认 180d） |
| P13 | **残余冗余索引清理** | 纯卫生，无风险但会动生产 DDL | 下次迁移顺手 DROP 四个冗余索引 |
| P14 | **race 修复的并发集成测试** | A1/A2/A3 竞态修复值得有 Promise.all 并发回归 | 仿 creditReservation.test.ts 模式补 3 个用例 |

## 五、验证（初始基线）

- `npx tsc --noEmit` — 0 错误
- `npm run lint` — 0 警告
- `npx vitest run` — **1078/1078 通过，7.4s**
- `npx prisma migrate status` — 34 迁移全部应用（新增 add_missing_indexes）

---

## 六、优化计划执行与落地报告（2026-09-12 收尾）

根据用户反馈与指令（“把值得做的做了，觉得没必要的就先不做，但是我想你把test覆盖率全面的提起来，P5也可以做了”），第二轮延后清单已落地推进：

### 1. 落地事项清单

| # | 事项 | 落地方案与成果 | 对应测试/验证 |
|---|---|---|---|
| **P1+P12** | MasterChatMessage 与 LlmLog 自动清理保留 | 新建 `masterChatRetention.ts`（>180d 批删）与强化 `logRetention.ts`（LlmLog >180d 硬删），支持环境变量覆盖与 dryRun 模式 | `src/lib/jobs/__tests__/retention.test.ts` (9 tests, 100% 覆盖) |
| **P2+P13** | turnIndex 唯一约束 + 冗余索引清理 | 生产数据重复检查（0重复项）；生成迁移 `20260912172000_turn_index_unique_and_drop_redundant_indexes`；清理 4 处冗余索引；`appendMasterChatMessage` 增加 P2002 冲突退避重试 | 数据诊断脚本 + 迁移成功应用 |
| **P3** | 压缩摘要持久化核查 | 生产数据核查：全生命周期 summarize 调用仅 7 次 vs master 806 次（0.9%），暂不增加合成行持久化复杂度，维持现状 | 数据查询脚本确认 |
| **P4** | Master 失败退款链路 | `src/lib/creditService.ts` 新增 `refundMasterCredits()`（原子性补偿与日志记录）；接入 `src/app/api/master/chat/route.ts` 错误与中止回调 | `src/lib/__tests__/creditService.test.ts` (9 tests) |
| **P5** | 分享撤销 DELETE 端点与前端交互 | `src/app/api/readings/[id]/share/route.ts` 新增 `DELETE` 路由（置 `shareToken: null`，幂等返回）；`ShareResultButton.tsx` 新增撤销分享操作按钮与提示 | `src/app/api/readings/__tests__/shareRoute.test.ts` (7 tests) |
| **P14** | 计费竞态并发集成测试 | 针对 A1（start/complete 注册奖励）、A2（gift 领取超额）、A3（推荐人奖励）编写并发请求模拟 | `src/__tests__/integration/billingRaces.test.ts` (3 并发测试通过) |

### 2. 测试覆盖率冲刺成果

补齐此前 0-8% 关键盲区的核心业务与底层通信链路：
- **`src/app/api/divination/__tests__/_inputValidation.test.ts`** (16 tests) — 验证输入字节上限、类型守卫与语言白名单
- **`src/app/api/divination/__tests__/_finalize.test.ts`** (7 tests) — 验证结果落地、持扣结算与多级拒绝门禁
- **`src/lib/__tests__/email.test.ts`** (12 tests) — 覆盖 88.57%，验证 token 生成、safeBaseUrl 白名单与各邮件模板
- **`src/lib/llm/__tests__/complete.test.ts`** (5 tests) — 覆盖 88.05%，验证 OpenRouter 调度、ClaudeProxy 本地代理、400/404/422 `response_format` 自动降级重试与终止信号
- **`src/lib/llm/__tests__/stream.test.ts`** (5 tests) — 覆盖 81.92%，验证流式 chunk、Tool call delta、done 事件与错误捕获
- **`src/lib/master/__tests__/turnEngine.test.ts`** (4 tests) — 覆盖 87.27%，验证大模型交互主循环、`[NEXT]` 气泡拆分、Tool 调度与持久化
- **`src/app/api/__tests__/routeHardening.test.ts`** (11 tests) — 验证 resend-verification 防枚举与限流、credits/history 分页夹紧、通知与反馈防越权

### 3. 最终验收指标

- **类型检查**：`npm run type-check`（`tsc --noEmit`）— **0 错误**
- **代码规范**：`npm run lint`（`next lint`）— **0 警告/错误**
- **测试套件**：`npm run test:ci`（Vitest）— **59 个文件，1201 个测试全部通过（耗时 7.22s）**
- **代码覆盖率**：全局语句覆盖率由约 40% 提升至 **52.79%**；`src/lib/llm` 达 **90.17%**，`src/lib/jobs` 达 **61.84%**，`src/lib/master` 达 **65.02%**

