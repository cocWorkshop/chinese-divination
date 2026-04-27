# 玄機 — 文檔索引

本目錄收錄玄機的工程文檔。按用途分四類：

```
docs/
├── architecture/     ← 「現在系統長這樣」 — 長期維護的功能/系統參考
├── references/       ← 占卜類型專家參考（gold standards、外部文章）
├── planning/         ← 當前 audit、draft、roadmap
└── archive/          ← 已被取代或已上線的歷史文檔
```

---

## architecture/ — 系統參考

新人看這裡。每份文檔對應一塊**已上線**的系統，記錄它為什麼這樣、資料怎麼流、邊界在哪。改動相關代碼前先讀。

| 文檔 | 涵蓋 |
|---|---|
| [overview.md](architecture/overview.md) | 整體架構概覽：占卜 pipeline、路由、handler 系統、LLM 抽象層 |
| [start-funnel.md](architecture/start-funnel.md) | `/start` 廣告漏斗：5 view + verify-sent，funnel cookie auth 雙軌，admin 運維介面，數位道場視覺風格 |
| [streaming-divination.md](architecture/streaming-divination.md) | 流式排盤：path-aware JSON parser + chart_ready + value_chunk SSE 協議 |
| [master-interaction-features.md](architecture/master-interaction-features.md) | 玄機大師三個互動機制：debounced burst send、用戶取消 CTA、閒置反思 |
| [master-portrait-system.md](architecture/master-portrait-system.md) | 玄機大師記憶系統：MasterChatMessage、UserPortrait 漸進式提取 |

## references/ — 占卜類型參考

不會改 code，但寫 prompt / 改 schema / 對標期望輸出時需要查。

| 文檔 | 涵蓋 |
|---|---|
| [bazi-gold-standard-example.md](references/bazi-gold-standard-example.md) | 八字 V2 schema 的標竿輸出範例（特定命盤） |
| [ziwei-gold-standard-example.md](references/ziwei-gold-standard-example.md) | 紫微 V2 schema 的標竿輸出範例 |
| [dayun-reference.md](references/dayun-reference.md) | 大運排盤外部參考文章（豆瓣） |

## planning/ — 當前 audit、draft、roadmap

進行中的提案、待 review 的草稿、最新的 audit。**會隨時間流動**——shipped 的搬到 archive，superseded 的也搬。

| 文檔 | 狀態 |
|---|---|
| [hci-audit-2026-04-27.md](planning/hci-audit-2026-04-27.md) | 25 條 HCI 優化提案，分 P0/P1/P2/P3。已完成：2.2、5.1、5.3、5.4、9.4。剩 P0：2.1（表單分段）、3.1（推理階段進度）、1.2（卡片 cost 透明）、3.3（超時警告） |

## archive/ — 歷史文檔

已被取代或已上線的計畫。**不再維護**，但保留以便追溯設計決策的脈絡。

| 文檔 | 狀態 |
|---|---|
| [hci-audit-2026-04-12.md](archive/hci-audit-2026-04-12.md) | 較早的 HCI audit（被 04-27 audit 取代）；P0/P1 多數已實作 |
| [master-answer-patterns-draft.md](archive/master-answer-patterns-draft.md) | 玄機大師 voice + answer-pattern 草稿；substantive 內容已併入 [`divination-refs/master.md`](../divination-refs/master.md) |
| [ziwei-upgrade-plan.md](archive/ziwei-upgrade-plan.md) | 紫微 V2 升級計畫；已透過 `ZiweiResultV2` + `ziweiSchemaV2` 上線 |

---

## 何時新增 / 何時搬

**新增**到 `architecture/` — 當你交付了一個獨立的子系統（funnel、streaming、master memory…）並希望未來自己或同事 0-context 也能快速重新進入。

**新增**到 `planning/` — 當你寫了一份 audit、draft proposal、或 roadmap 文件，等待 review 或實作中。

**從 planning → architecture** — 當 plan 完整 ship，把 plan 文件本身改成「這就是現在系統長這樣」的形態（更新 status header、移除 TODO list、保留設計理由），然後搬。

**從 planning / architecture → archive** — 當文檔已被新版取代（如 hci-04-12 被 04-27 取代），或當文檔描述的計畫已實作且 architecture/ 裡有對應替代品。

**從 archive → 刪除** — 不刪。git 歷史已經保留，留著看設計脈絡的成本是零。

---

## 寫作風格慣例

- 中英混用 OK（玄學/命理術語用中文，技術術語用英文），跟 master 的 voice 一致
- 用實際的代碼路徑做 markdown link，如 `[chatMessageStore.ts:50](../../src/lib/master/chatMessageStore.ts#L50)`
- 每份文檔結尾加「新 session 啟動建議第一句話」——讓未來自己/同事 0-context 也能快速接續
- 別過度抽象。具體的「為什麼這樣寫」比一份漂亮的架構圖有用十倍
