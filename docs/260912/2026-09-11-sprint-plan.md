# 玄机冲刺执行计划（2026-09-11 PM → 09-13）

**前提:** 单人 + little 协作，2.5 天高密度。原则：**推广获客 > 产品包装 > 功能 > 基建**（基建只做收尾，不新开坑）。
**分工:** little 起草所有内容（Wiki/文案/社媒帖/邮件）+ 代码走 PR；Elvin 审核、合并、部署、出镜素材。
**硬规则不变:** 不直接 push main，PR → review → merge；prod 手动 deploy.sh 挑低峰。

---

## Track A — 推广获客（最高优先）

### A1. Wiki/SEO 内容（P0，4月建的功能文章数=0）
- [ ] 15–20 篇，繁中为主 + 英文 3–5 篇
- 关键词对齐交易型搜索: 八字排盘/紫微斗数免费排盘/紫微斗数 online/八字算命/bazi calculator/chinese zodiac compatibility/六爻起卦
- 结构: 知识科普 + 内链到排盘页 CTA（"免费排盘"按钮）
- **分工: little 起草 → Elvin 10min/篇审核发布（Wiki 后台直接发，不走 PR）**
- DoD: 本周末 ≥12 篇已发布，每篇有内链 CTA

### A2. 小红书开号 + 首批内容
- 人设: "程序员做了一台 AI 命理机"（开发日记角度，避开占卜营销限流）
- 首批 3 篇: ①我做了一个免费八字排盘网站 ②AI 紫微解盘有多细（截图展示 8-section）③程序员视角: 23 种紫微格局是怎么程序化的
- **分工: little 写文案 → Elvin 配图发布**
- DoD: 账号开好、3 篇发布、每篇挂链接/引导

### A3. 社群运营与礼品链接投放（定位：种子共创，严防羊毛党）
- **核心定位原则（避免成为死群/羊毛群）**:
  - **绝不做纯“免费点数分享群”**：玄学排盘每次消耗真实 Claude/OpenRouter Token，有刚性成本；纯免费群只会引来低付费意愿的羊毛党并迅速沦为死群。
  - **升级为“种子用户共创 / 命理案例交流群”**：将免费点数从“无条件普发”转为“高价值行为交换”（如：提有效反馈/Bug、分享真实脱敏案例复盘换取点数；每日限量 5~10 份，保持稀缺）。
  - **平台风控防线**：微信对玄学与诱导裂变敏感，严禁在微信生态搞“拉人头送点数”，防止封群封域名。
- [ ] 制作 2 个专属礼品链接（/admin/gift-links，带 note 归因: 多伦多华人群 / Reddit 试水，设置兑换上限与有效期）
- [ ] 种子群建群规范制定：群名与定位为「玄机AI内测体验群」，入群即明示“反馈换算力”规则
- [ ] 投放: 多伦多/北美华人 WeChat 群、Reddit r/iching 等自然帖（结合真实盘面/卦例输出，带体验链接）
- DoD: 链接发出，能按链接归因注册；建立以反馈交流为导向的种子群规则，防止被脚本批量刷取

### A4. 埋点（推广的前提，没有数据=盲打）
- [ ] 选型: PostHog Cloud 免费档（10 分钟接入）或 Umami self-host（复用现有基建）
- 事件: register / reading_start(按类型) / reading_complete / master_chat / share / paywall_view / purchase
- DoD: 漏斗看板能回答: 注册→首排盘转化率、各功能使用占比

---

## Track B — 产品包装

- [ ] **首页 hero 重写**: 从"8 门术数工具"改为双场景叙事——「认识自己(八字/紫微)」+「问一件事(六爻/梅花)」，CTA = 免费排盘
- [ ] 品牌一致性: 玄機 XuanJi logo/favicon/OG 图统一（分享卡用）
- [ ] OG/分享卡图: 排盘结果页 → 精美分享图（与 A 冲刺的分享机制配套）
- [ ] 免责声明: 全站 footer + 结果页 "仅供参考·传统文化体验，不构成医疗/投资/法律建议"
- **分工: little 起草全部文案 → Elvin 定稿 → 代码走 PR**
- DoD: 新首页上线，OG 卡在 Telegram/微信转发时显示正常

---

## Track C — 功能调整升级（本周只做 2 个）

### C1. 分享解读卡 + 分享得积分（增长闭环核心）
- 结果页生成分享卡（含站点链接）→ 分享/复制链接 → 得积分
- 复用现有: ShareLink 表、CreditLog、积分体系全是现成的
- DoD: 用户可一键生成分享卡，分享动作记账，归因可查

### C2. 免费额度任务化与成本风控（轻量版）
- 把补贴预算变成增长预算：保留少量每日赠送（兜底体验），新增: 分享 +X、完善档案 +X
- **风控与转化设计**:
  - **防刷频控**: 限制单 IP/单设备每日任务获取上限，防小号脚本批量套取 Token
  - **漏斗分层（Free-to-Paid）**: 免费额度用于轻量体验（基础排盘与核心梗概），深度化解、流年精批引导付费充值/订阅
- DoD: CreditLog 出现 grant_share 等新 action，且有频控保护

### C3.（stretch，时间不够顺延）2027 流年报告 MVP
- 免费展示报告目录 → 付费解锁全文（复用 reading tiers 机制）
- 这是下一个付费锚点，优先级高于一切新功能，但本周末做不完不强求

---

## Track D — 开发运维 CI/CD（收尾 8/27 遗留，全程 timebox ≤3h）

- [ ] **backup script + systemd timer**: scripts/backup-divination-db.sh + divination-backup.timer，每天 03:00，保留 7 天，跑一次验证 dump 可恢复（实测 8/27 方案已收敛，只差落地；截至 9/11 未做，/home/elvin/backups/divination/ 不存在）
- [ ] **GitHub main 分支保护**: require PR + CI status check（前提: gh auth login）
- [ ] **docker-compose.dev.yml + .env.dev**: 8088 test 环境 + watchtower label enable=true；prod compose 加 enable=false + IMAGE_TAG 参数化
- [ ] **E2E smoke**: test 环境（xuanji.bakers.top）注册→排盘→积分扣减全链路跑通（scripts/smoke-test-api.mjs 已有底子）
- DoD: 分支保护生效、备份 timer active、test 环境自动更新、smoke 全绿

---

## Track E — GitHub Issues 待办

⚠️ **9/11 实测: gh CLI 未登录，公开 API 404（repo 私有）→ 无法枚举**
- [ ] 第一步（15min）: Elvin 跑 `gh auth login`
- [ ] 第二步（30min）: `gh issue list --state open` 全量拉出 → 四桶分拣: ①阻塞转化的快修（本周末做）②产品改进（排期）③技术债（冻结）④过时关闭
- DoD: 每条 issue 有桶和去向，桶① 数量 ≤3 且修完

---

## 时间表

### 今天下午 9/11（Fri，~4h）
| 时长 | 事项 |
|---|---|
| 15min | gh auth login + issue 全量拉出 |
| 30min | issue 四桶分拣（Elvin+little） |
| 1h | 埋点接入（PostHog/Umami）+ 部署 |
| 1h | little 出首页文案稿 + OG 卡方案 → Elvin 定稿 |
| 1h | little 出 Wiki 前 5 篇 → Elvin 审核发布 |
| 45min | 备份 script + timer 落地验证 |

### 明天 9/12（Sat，~7h）
| 时长 | 事项 |
|---|---|
| 2h | Track D 收尾: 分支保护 + compose.dev + smoke E2E |
| 3h | C1 分享卡开发（little 写 PR，Elvin review+deploy） |
| 1h | 小红书: 开号 + 3 篇发布（little 稿已备） |
| 1h | 礼品链接 2 个制作+投放；Wiki 再发 5 篇 |

### 后天 9/13（Sun，~5h）
| 时长 | 事项 |
|---|---|
| 2h | C2 任务化积分 + 桶① issue 快修 |
| 2h | C3 流年报告 MVP（stretch）或邮件模板 2 个 |
| 1h | 复盘: 埋点漏斗首轮数据 + 下周主渠道决策 |

---

## 周日验收清单
- [ ] Wiki ≥12 篇上线；小红书 ≥3 篇；2 个礼品链接在外
- [ ] 埋点漏斗可见；新首页 + OG 卡上线
- [ ] 分享卡功能上线；分支保护 + 备份 timer + test 环境自动化全绿
- [ ] Issues 全部分拣，桶① 清零
- 未达标项 → 直接顺延，不加人也不砍验收标准

## 下周衔接
- 主渠道归因复盘 → 定主力渠道
- 流年报告正式化 + 定价试验（单次 vs 订阅）
- Android 壳上架 Google Play（Capacitor 壳已存在）
- 英文版决策暂缓（等繁中版付费转化数据）
