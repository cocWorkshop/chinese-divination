# 玄機大師 — 核心占卜技能升級計劃

**Status:** Draft / 計劃中
**Date:** 2026-04-27
**Owner:** Wei Zhang
**Scope:** `src/lib/master/skills/`

---

## 0. 背景

`gua_ming_hu_can`（卦命互參）已驗證了一個重要的產品形態：**Master 不直接運算，而是把已存在的 readings 通過 prose recipe 編排成更高階的解讀經驗**。Skills 在系統內的本質是：

- 一份 prose recipe（被 LLM 而非 code 執行）
- 不增加新的計算器、不寫新 API、不需 schema 變更
- 一個檔案 + 一行 registry，加 skill 的邊際成本接近於零
- 唯一的隱性成本：每個 skill 都會被 inject 進 system prompt，太多會讓 master 在選擇時混淆並使 prompt cache 失效更頻繁

因此 skill roadmap 的核心問題不是「能加多少」，而是「**哪些方法論能轉化成讓用戶覺得 Master 真的懂、並且不重複既有 reading 也不重複既有 skill 的高階體驗**」。

---

## 1. 中國術數體系內的高階方法論清單

以下整理參考用戶提供的腦力激盪結果，作為 skill 候選池：

### 一、跨系統互參類

| 方法 | 核心 | 在本系統內的對映 |
|---|---|---|
| **三式互參**（太乙／奇門／六壬） | 同一事件三式分別起局相互印證 | ❌ 缺 taiyi/liuren 計算器；只有 qimen |
| **星命合參**（紫微 ⊕ 八字） | 兩個命理體系互校，一致則信度高，衝突則找和解點 | ✅ 兩者皆已實作為 reading type |
| **卦氣與節令互參** | 易卦 × 二十四節氣／七十二候 | ⚠️ 概念有趣但缺乏 reading 載體 |

### 二、同系統內部高階推演

| 方法 | 核心 | 在本系統內的對映 |
|---|---|---|
| **鐵板神數考刻** | 反算父母／兄弟資訊逼近真實生時 | ❌ 需互動式試算迴圈；非 read-only skill 形態 |
| **梅花體用之變** | 動爻、互卦、變卦、外應多重疊加 | ⚠️ 已存在於 meihua reading 內部；不必 skill |
| **紫微四化飛星** | 本命／大限／流年三盤四化串聯 | ⚠️ 屬 ziwei V3 升級而非 master skill |

### 三、與堪輿、擇日的交叉

| 方法 | 核心 | 在本系統內的對映 |
|---|---|---|
| **命理 ⊕ 風水互參** | 用 bazi 喜用神調整阳宅佈局，反向用風水補命局 | ✅ bazi + fengshui 皆有 reading；可成 skill |
| **造命擇日** | 根據命主八字選一個吉時讓格局補本命 | ⚠️ 缺擇日計算器；可借 qimen/meihua 近似 |

### 四、與宗教／醫學體系融合

| 方法 | 核心 | 在本系統內的對映 |
|---|---|---|
| **醫易同源** | bazi/紫微 × 中醫五行藏象判病傾向 | ⚠️ 醫療判斷 scope 風險高，不適合 master 直接做 |
| **符籙術數結合** | 知命 → 改命層的法事推薦 | ❌ 不符合產品定位 |

---

## 2. 篩選與分級

判據：
1. **可實現性** — 所需底層 reading 是否已存在？
2. **獨特性** — 是否與既有 skill 重疊？
3. **產品價值** — 是否在用戶心智中是「真懂行」的標誌性能力？
4. **scope 安全** — 是否會逼 master 越界（醫療／法律／賭博）？

### Tier 1 — 立即實作

| Skill | 為什麼 |
|---|---|
| **星命合參**（`xing_ming_he_can`，紫微 ⊕ 八字） | 與 `bazi_hepan` 同形（讀兩 reading → 對比 → 綜合），但軸線不同（同一個人的兩套命理視角，而非兩個人）。傳統上是命理高手必備的雙系統互校。底層全部就緒。**本次 PR 範圍。** |

### Tier 2 — 下一輪候選（先不做，看 Tier 1 表現）

| Skill | 為什麼延後 |
|---|---|
| **命理風水互參**（`ming_li_feng_shui`，bazi 喜用神 → fengshui 方位調整） | 港台實踐中常見、有市場感，但需先驗證用戶會否真的在 master 內串聯這兩個 reading；Tier 1 跑一陣再回來。 |
| **造命擇日**（`zao_ming_ze_ri`，bazi 缺陷 → qimen/meihua 推薦吉時） | 概念極好但無原生擇日計算器；目前只能用 qimen/meihua 近似，可能讓 master 給出超出底層支撐的承諾。需要先評估是否要做擇日 calculator。 |

### Tier 3 — 暫不實作

| Skill | 否決原因 |
|---|---|
| 三式互參 | 缺 taiyi/liuren 底層 |
| 鐵板考刻 | 需互動試算迴圈，非 prose recipe 形態 |
| 紫微飛星 | 屬於 ziwei reading 自身的 V3 升級方向，不該做成 master skill |
| 醫易同源 | 醫療判斷 scope 風險，與 master.md 的 "Capabilities — CANNOT" 條款衝突 |
| 卦氣節令互參 | 缺 reading 載體 |
| 符籙結合 | 不符合產品定位 |

---

## 3. Tier 1 詳細設計：`xing_ming_he_can`（星命合參）

### 3.1 產品定位

**用一句話說**：「拿您的紫微和八字一起看，兩個體系若指向同一件事，那就是命中很重的訊號；若有衝突，就找它們的和解點。」

**為什麼用戶會用**：
- 已經做過 bazi 但對結果半信半疑 → 想要第二意見
- 已經做過 ziwei 但其抽象星曜語言難以接地 → 想要 bazi 的具體五行十神語言來印證
- 對特定生命主題（事業／感情／健康）想做「兩盤都這麼說」的高信度判讀

**和現有 skill 的差異**：
- vs `bazi_hepan`（兩人 × 一系統）→ 本 skill 是 **一人 × 兩系統**
- vs `gua_ming_hu_can`（一卦 × 命盤錨）→ 本 skill 不涉及卦，只在兩套命盤之間互校

### 3.2 Prerequisites

- **self bazi reading 已保存**
- **self ziwei reading 已保存**

兩個都缺 → 引導先排 bazi（門檻低、適用面廣）；只缺其中一個 → 引導補另一個。

### 3.3 Recipe 結構

```
Phase A — 確認雙盤齊備
  list_readings({type:'bazi', targetType:'self'})
  list_readings({type:'ziwei', targetType:'self'})  # 並行
  缺哪盤 → prefill_divination_form 引導補，停止 recipe

Phase B — 拉雙盤資料
  get_reading on bazi
  get_reading on ziwei  # 並行（同一輪 tool_calls）

Phase C — 對位互校（核心）
  按主題抽取兩盤對應位點，逐一比對：
    主題：日主強弱 ↔ 命宮主星格局
    主題：喜用神五行 ↔ 三方四正吉星五行
    主題：忌神 ↔ 化忌星宮位
    主題：大運走勢 ↔ 大限飛化
    十神配置 ↔ 六親宮主星

Phase D — 三類結論
  1) 雙盤同向 → 高信度結論（"兩盤都顯示..."）
  2) 雙盤分歧 → 不藏拙、明說分歧、給和解判讀
  3) 一盤明顯一盤模糊 → 以明顯者為主、模糊者為佐

Phase E — On-demand 深探
  用戶追問特定主題 → get_reading_detail 對應 section
```

### 3.4 對位映射表（embed in recipe）

| 主題 | BaZi 取點 | ZiWei 取點 |
|---|---|---|
| 性格／自我 | 日主 + 月令旺衰 | 命宮主星 + 身宮 |
| 感情婚姻 | 配偶宮（日支）+ 夫妻星 | 夫妻宮三方四正 |
| 事業財運 | 正官／七殺／正財／偏財 + 喜用神運 | 官祿宮、財帛宮主星 + 化權／化祿落宮 |
| 健康 | 五行偏枯 + 忌神所在 | 疾厄宮 + 化忌星 |
| 父母／長輩 | 印星 + 年柱 | 父母宮 |
| 兄弟／同儕 | 比劫 | 兄弟宮 |
| 子女 | 食傷 | 子女宮 |
| 大運週期 | 大運 + 流年 | 大限 + 流年四化 |

### 3.5 衝突解讀方針（這一點要寫進 recipe）

「兩盤分歧」是命理高手最有價值的判讀場景，**不能滑過**：

1. **不要強行統一** — 直接說「八字看是 X，紫微看是 Y」，並承認有分歧
2. **嘗試和解** — 從「時間相位」（早年 vs 中年 vs 老年）、「主題層次」（外在 vs 內在）、「人生領域」找差異化解釋
3. **若實在無法和解** — 給出更謹慎的口吻，建議用一卦（六爻）作為第三方仲裁

### 3.6 Output style

- 一段 60-120 字的綜合判讀（雙盤同向部分為主）
- 一個 2-4 條的 bullet 對比清單（按用戶提問的主題排序）
- 若有衝突，明確標出「**雙盤分歧**：...」段落
- 結尾 1-2 條具體建議或警示，貼著兩盤共同證據

### 3.7 Triggers

- 「合參」、「互校」、「對照」、「兩盤一起看」、「八字紫微一起」
- "cross check destiny", "compare bazi and ziwei"

---

## 4. 不做的事 / Out of scope

- ✗ 不做新計算器、不改 reading schema、不加 tool primitive
- ✗ 不在本 PR 內處理 Tier 2/3
- ✗ 不引入「自動觸發 skill」機制（仍由 master 從 trigger cues + question shape 自行判斷）
- ✗ 不寫專屬 UI（CTA card 等沿用現有路徑）

---

## 5. 風險與監控

| 風險 | 監控方式 |
|---|---|
| Skill 過多導致 master 在選擇時混淆 | 看實際對話樣本中 master 是否誤觸 skill recipe（如把單純 bazi 提問跑成合參） |
| Prompt cache 失效率上升 | LLM 模組已有 reasoning capture；可在後續觀察 catalog 段是否頻繁變動 |
| 兩盤結論被 master 強行 reconcile（隱藏衝突） | 透過樣本檢視「雙盤分歧」段落出現頻率，太低代表 master 在迴避 |

---

## 6. 何時搬家

- **shipped 後** → 把本文件 status header 改成「Shipped」、移除 "Tier 1 待實作" 部分、保留 Tier 2/3 候選池作為下一輪 roadmap，整份搬到 `docs/architecture/master-skills-system.md` 或合併進 `master-portrait-system.md` 的同層
- **Tier 2/3 重新評估後** → 把更新後的 roadmap 開新檔，舊版進 archive

---

**新 session 啟動建議第一句話**：「我要看 master skills 的擴充計劃 / 看 xing_ming_he_can 的設計 → `docs/planning/divination-skill-roadmap-2026-04-27.md`，實作在 `src/lib/master/skills/xingMingHeCan.ts`。」
