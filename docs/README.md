# 玄機 — 工程與產品文檔總覽

本目錄收錄「玄機」AI 中國傳統術數預測系統的工程架構、領域知識標準、進行中規劃與歷史歸檔文檔。

---

## 目錄結構概覽

```
docs/
├── README.md                 ← 【文檔總索引】（本文檔）
├── DEPLOYMENT.md             ← 【運維手冊】生產環境配置、質量門禁、Docker 部署與日誌排查
│
├── 260912/                   ← 【當前重點專項】2026-09 產品分析、Sprint 計畫與東方美學重構
│   ├── 2026-09-11-product-analysis.md
│   ├── 2026-09-11-sprint-plan.md
│   ├── 2026-09-12-product-design-enhancement-plan.md
│   └── 2026-09-12-ui-ux-aesthetic-audit-and-redesign.md
│
├── architecture/             ← 【系統架構】長期維護的已上線核心功能與子系統架構設計
│   ├── overview.md
│   ├── master-interaction-features.md
│   ├── master-portrait-system.md
│   ├── start-funnel.md
│   └── streaming-divination.md
│
├── references/               ← 【領域參考】排盤標竿範例、演算法則、大師微信實戰話術
│   ├── bazi-gold-standard-example.md
│   ├── ziwei-gold-standard-example.md
│   ├── dayun-reference.md
│   └── master-chat-scenarios.md
│
├── planning/                 ← 【進行中規劃】當前架構審計、性能優化與延後項追蹤
│   └── audit-2026-09-round2.md
│
└── archive/                  ← 【歷史歸檔】已完全上線、已過期或已整合的歷史記錄
    ├── changelog-2026-06.md
    ├── prisma-migrations-recovery-202606.md
    ├── deferred-evaluation-tasks-202606.md
    ├── activation-resume-design-2026-04-27.md
    ├── divination-skill-roadmap-2026-04-27.md
    ├── hci-audit-2026-04-27.md
    ├── uix-hci-audit-2026-06-12.md
    └── ziwei-upgrade-plan.md
```

> **注意**：根目錄下的 `divination-refs/` 為**運行時動態載入的 LLM 提示詞模版**，屬於核心業務資產，請參閱下方專項說明。

---

## 1. 系統架構 (`architecture/`)

適合新成員與系統維護者查閱。每一份文檔均對應線上穩定運行的核心機制：

| 文檔 | 核心涵蓋內容 |
|---|---|
| [overview.md](architecture/overview.md) | **系統全貌白皮書**：八大術數體系「程序排盤 + LLM 解盤」雙軌機制、四大架構不變量、機緣（Karma）點數原子預扣與賬本架構。 |
| [streaming-divination.md](architecture/streaming-divination.md) | **流式解讀架構**：SSE 協議、字符級 JSON 流式狀態機 (FSM)、15s 心跳保持、RAF 60fps 節流與超長調用進度漸進。 |
| [master-interaction-features.md](architecture/master-interaction-features.md) | **大師互動機制**：全局狀態機、防抖連發（1500ms）、在途打斷與追問、CTA 反轉、閒置反思（75-120s）與激活續接。 |
| [master-portrait-system.md](architecture/master-portrait-system.md) | **大師記憶系統**：三層記憶架構圖（原始對話、60K Token 滑動壓縮、雙軸畫像提取）、個性化 Prompt 快取與 GDPR 隱私邊界。 |
| [start-funnel.md](architecture/start-funnel.md) | **廣告獲客漏斗**：`/start` 5-View 漏斗狀態轉移圖、無感試用排盤、Funnel Cookie 鑑權與試用轉正防刷機制。 |

---

## 2. 領域參考與範例庫 (`references/`)

改動提示詞（Prompt）、調整輸出 Schema 或對齊專家期望時查閱：

| 文檔 | 核心用途 |
|---|---|
| [bazi-gold-standard-example.md](references/bazi-gold-standard-example.md) | 八字 V2 標竿輸出範例與 **架構級四維度質檢規約 (Evaluation Rubric)**。 |
| [ziwei-gold-standard-example.md](references/ziwei-gold-standard-example.md) | 紫微斗數 V2 標竿輸出範例與 **星曜四化因果鏈評測規約 (Evaluation Rubric)**。 |
| [dayun-reference.md](references/dayun-reference.md) | **大運算法工程規格書**：天文節氣交節標準、高精度折算數學公式、極端邊界處理與代碼映射。 |
| [master-chat-scenarios.md](references/master-chat-scenarios.md) | **大師實戰話術庫**：22 個真實 WeChat 對話樣本、五階對話控制模型、四大安全紅線與 LLM-as-a-Judge 評測指標。 |

---

## 3. 當前專項與規劃 (`260912/` & `planning/`)

記錄正在進行或本期迭代的產品設計與技術審計：

| 目錄 / 文檔 | 狀態 / 說明 |
|---|---|
| [docs/260912/](260912/) | **當前主線專項**：包含競品深度分析、Sprint 衝刺計畫、東方美學與去 AI 模板化 UI/UX 重構方案。 |
| [planning/audit-2026-09-round2.md](planning/audit-2026-09-round2.md) | **第二輪深度技術審計報告**：計費併發競態修復、安全加固、數據庫索引優化、以及 P1~P14 延後待辦清單。 |

---

## 4. 歷史歸檔 (`archive/`)

已 100% 落地、已被新版本取代或僅保留歷史決策脈絡的檔案，**不再日常維護**：

| 文檔 | 原用途與歸檔理由 |
|---|---|
| [changelog-2026-06.md](archive/changelog-2026-06.md) | 整合 2026-06 重構衝刺（Phase 0~2、UIX W0~W5）全部 11 份變更記錄。 |
| [prisma-migrations-recovery-202606.md](archive/prisma-migrations-recovery-202606.md) | 2026-06 數據庫 Drift 調和歷史手冊（生產庫已完全調和，保留排查參考）。 |
| [deferred-evaluation-tasks-202606.md](archive/deferred-evaluation-tasks-202606.md) | 6 月延後項評估分析（術數神煞傳統對齊已入庫，Bcrypt 恒時性已修復）。 |
| [activation-resume-design-2026-04-27.md](archive/activation-resume-design-2026-04-27.md) | 大師激活續接機制原始提案（已上線，現行架構見 `architecture/`）。 |
| [divination-skill-roadmap-2026-04-27.md](archive/divination-skill-roadmap-2026-04-27.md) | 大師技能擴展路線圖（星命合參等 Tier 1/2 技能已在 `src/lib/master/skills/` 實作）。 |
| [hci-audit-2026-04-27.md](archive/hci-audit-2026-04-27.md) | 4 月 HCI 審計報告（P0/P1/P2 優化項已全部實現）。 |
| [uix-hci-audit-2026-06-12.md](archive/uix-hci-audit-2026-06-12.md) | 6 月 UIX 審計報告（W0~W5 已全部實現）。 |
| [ziwei-upgrade-plan.md](archive/ziwei-upgrade-plan.md) | 早期紫微解盤 V2 升級計畫（已全面上線）。 |

---

## 運行時 LLM 提示詞模版 (`divination-refs/`)

根目錄下的 `divination-refs/` 檔案由 `src/lib/llm/prompts.ts` 與 `src/lib/master/systemPrompt/persona.ts` 在**服務運行時動態載入**：

| 檔案 | 載入模組 | 作用 |
|---|---|---|
| `master.md` | `persona.ts` | 玄機大師人設、語氣規則（Voice）、能力邊界、打斷與反思行為準則。 |
| `bazi.md` | `prompts.ts` | 八字命理解讀框架：旺衰論、調候用神、格局、十神喜忌。 |
| `ziwei.md` | `prompts.ts` | 紫微斗數解讀框架：十二宮格局、四化飛星、吉凶星耀互涉。 |
| `iching.md` | `prompts.ts` | 周易六十四卦卦辭、爻辭解讀體系。 |
| `liuyao.md` | `prompts.ts` | 京房六爻納甲、世應、六親取用神法則。 |
| `qimen.md` | `prompts.ts` | 奇門遁甲天地盤、九星、八門、八神吉凶格局。 |
| `fengshui.md` | `prompts.ts` | 陽宅風水四獸、八宅與形法調理。 |
| `others.md` | `prompts.ts` | 梅花易數、六壬起卦與體用生剋。 |

> ⚠️ **修改提示**：變更 `divination-refs/` 內的 Markdown 檔案將**直接影響線上大模型推理與生成風格**，請務必先在測試環境或配合標竿評測驗證。
