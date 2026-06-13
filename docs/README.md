# 玄機 — 文檔索引

本目錄收錄玄機的工程文檔。按用途分四類：

```
docs/
├── architecture/     ← 「現在系統長這樣」 — 長期維護的功能/系統參考
├── references/       ← 占卜類型專家參考（gold standards、外部文章）
├── planning/         ← 當前 audit、draft、roadmap
└── archive/          ← 已被取代或已上線的歷史文檔
```

另有 `divination-refs/` 目錄——**運行時載入的 LLM 提示詞參考**，不屬於開發文檔，見下方說明。

---

## architecture/ — 系統參考

新人看這裡。每份文檔對應一塊**已上線**的系統。

| 文檔 | 涵蓋 |
|---|---|
| [overview.md](architecture/overview.md) | 整體架構概覽：占卜 pipeline、handler 系統、LLM 雙通道（OpenRouter + Claude Proxy） |
| [start-funnel.md](architecture/start-funnel.md) | `/start` 廣告漏斗：5 view + verify-sent，funnel cookie auth 雙軌 |
| [streaming-divination.md](architecture/streaming-divination.md) | 流式排盤：SSE 協議 + streaming JSON parser + 15s heartbeat + 推理 token 上限 |
| [master-interaction-features.md](architecture/master-interaction-features.md) | 玄機大師互動機制：burst send、CTA 取消、智能反思（75-120s 抖動 + 內容感知門控）、激活續接 |
| [master-portrait-system.md](architecture/master-portrait-system.md) | 玄機大師記憶系統：兩軸提取觸發（≥8 輪 OR ≥24h+3 輪）、漸進式 portrait 更新 |

## references/ — 占卜類型參考

不會改 code，但寫 prompt / 改 schema / 對標期望輸出時需要查。

| 文檔 | 涵蓋 |
|---|---|
| [bazi-gold-standard-example.md](references/bazi-gold-standard-example.md) | 八字 V2 schema 的標竿輸出範例 |
| [ziwei-gold-standard-example.md](references/ziwei-gold-standard-example.md) | 紫微 V2 schema 的標竿輸出範例 |
| [dayun-reference.md](references/dayun-reference.md) | 大運排盤外部參考文章 |

## planning/ — 當前 audit、draft、roadmap

進行中的提案。shipped 的搬到 archive。

| 文檔 | 狀態 |
|---|---|
| [uix-hci-audit-2026-06-12.md](planning/uix-hci-audit-2026-06-12.md) | 系統性 UIX/HCI audit v2 — W0–W5 已實作（見 docs/changes/2026-06-12-uix-w0~w5）；遺留：axe 實測、FCM push、master history 分頁 |
| [hci-audit-2026-04-27.md](planning/hci-audit-2026-04-27.md) | 25 條 HCI 優化提案 — P0/P1 已全部實作，P2 大部分完成（剩餘項已併入 06-12 audit） |
| [divination-skill-roadmap-2026-04-27.md](planning/divination-skill-roadmap-2026-04-27.md) | Master skill 擴充 roadmap — Tier 1 已實作（合盤 + 卦命互參） |
| [activation-resume-design-2026-04-27.md](planning/activation-resume-design-2026-04-27.md) | Master 激活續接機制 — 已實作（4 種 hint 變體） |

## archive/ — 歷史文檔

已被取代或已上線。**不再維護**，保留追溯設計決策。

| 文檔 | 狀態 |
|---|---|
| [hci-audit-2026-04-12.md](archive/hci-audit-2026-04-12.md) | 較早的 HCI audit（被 04-27 取代） |
| [master-answer-patterns-draft.md](archive/master-answer-patterns-draft.md) | 大師 voice + answer-pattern 草稿，已併入 `master.md` |
| [ziwei-upgrade-plan.md](archive/ziwei-upgrade-plan.md) | 紫微 V2 升級計畫，已上線 |
| [master-chat-scenarios-reference.md](archive/master-chat-scenarios-reference.md) | 22 個 WeChat 對話場景設計稿（對話技巧：拋鉤子、鏡像情緒、軟對抗等） |

## 其他頂層文檔

| 文檔 | 涵蓋 |
|---|---|
| [ui-improvement-proposal-2026-04-27.md](ui-improvement-proposal-2026-04-27.md) | 34 個 UI 改進項 — P0/P1/P2 已全部實作 |

---

## divination-refs/ — 運行時 LLM 提示詞

這些文件由 `src/lib/llm/prompts.ts` 和 `src/lib/master/systemPrompt/persona.ts` 在**運行時載入**，作為 LLM 的指令參考。**改動這些文件直接影響 LLM 輸出品質。**

| 文件 | 載入者 | 用途 |
|---|---|---|
| `master.md` | `persona.ts` | 玄機大師人格、voice 規則、激活機制、bubble 節奏、能力邊界 |
| `bazi.md` | `prompts.ts` | 八字解讀框架：旺衰論、調候、格局定法、十神 |
| `ziwei.md` | `prompts.ts` | 紫微解讀框架：格局、四化飛星、三方四正 |
| `iching.md` | `prompts.ts` | 易經理論：8 經卦 64 別卦、爻辭解讀 |
| `liuyao.md` | `prompts.ts` | 六爻規則：京房納甲、世應、六親、用神 |
| `qimen.md` | `prompts.ts` | 奇門遁甲：九宮、八門、八神、天地盤 |
| `fengshui.md` | `prompts.ts` | 風水：四獸、形法、八宅理論 |
| `others.md` | `prompts.ts` | 梅花易數、六壬：時間起卦、體用卦 |

---

## 寫作慣例

- 中英混用 OK（命理術語中文，技術術語英文）
- 用實際代碼路徑做 link：`[chatMessageStore.ts:50](../../src/lib/master/chatMessageStore.ts#L50)`
- 每份文檔結尾加「新 session 啟動建議第一句話」
- 別過度抽象。具體的「為什麼這樣寫」比架構圖有用十倍
