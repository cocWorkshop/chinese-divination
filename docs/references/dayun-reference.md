# 大運排盤與交運時間算法工程規格書 (DaYun Algorithmic Specification)

> **版本**：v2.0 (系統工程標準規範)  
> **維護者**：術數算法與核心架構組  
> **代碼對標**：[`src/lib/baziCalculator.ts`](file:///c:/Users/DaZWe/Developer/chinese-divination-dev/src/lib/baziCalculator.ts) 及 [`src/lib/__tests__/baziCrossValidation.test.ts`](file:///c:/Users/DaZWe/Developer/chinese-divination-dev/src/lib/__tests__/baziCrossValidation.test.ts)

---

## 一、算法理論基礎與天文曆法定義

大運是八字命理學中表徵個體生命週期運勢起伏的十進制時間序列（每步大運管十年）。其數學排布本質是**月柱干支依據性別與年干陰陽進行的順逆循環進位**，起運交運時間則取決於**出生時間點與節氣交界點之間的時間跨度折算**。

### 1. 核心定序法則
- **基準軸心**：以生辰八字中的**月柱 (Month Pillar)** 干支為基點向後或向前遞推；
- **順逆判定矩陣**：
  $$\text{Direction} = \begin{cases} 
  \text{Forward (順行)}, & (\text{YearStem} \in \{\text{甲,丙,戊,庚,壬}\} \land \text{Gender} = \text{Male}) \lor (\text{YearStem} \in \{\text{乙,丁,己,辛,癸}\} \land \text{Gender} = \text{Female}) \\
  \text{Backward (逆行)}, & (\text{YearStem} \in \{\text{乙,丁,己,辛,癸}\} \land \text{Gender} = \text{Male}) \lor (\text{YearStem} \in \{\text{甲,丙,戊,庚,壬}\} \land \text{Gender} = \text{Female})
  \end{cases}$$

### 2. 節氣交節標準（只論節，不論氣）
起運計算嚴格僅以二十四節氣中的 **12 個「節令 (Jie)」** 為時間標尺，12 個「中氣 (Qi)」不參與起運邊界計算：
- **十二節令標尺**：立春 (寅月)、驚蟄 (卯月)、清明 (辰月)、立夏 (巳月)、芒種 (午月)、小暑 (未月)、立秋 (申月)、白露 (酉月)、寒露 (戌月)、立冬 (亥月)、大雪 (子月)、小寒 (丑月)。

---

## 二、起運時間折算數學模型

### 1. 時間跨度 $\Delta T$ 定義
設出生時刻為 $T_{\text{birth}}$（精確至毫秒的真太陽時時間戳）：
- **順行**：$\Delta T = T_{\text{next\_jie}} - T_{\text{birth}}$（從出生時刻計算至出生後的**下一個節令**時刻）；
- **逆行**：$\Delta T = T_{\text{birth}} - T_{\text{prev\_jie}}$（從出生時刻倒推至出生前的**上一個節令**時刻）。

### 2. 傳統折算率常數表
傳統命理依據「一年 360 天、一節一氣 30 天」的理想模型對應人壽三萬六千日，折算率如下：

| 天文時間跨度 ($\Delta T$) | 對應大運起運時間 | 換算比例 |
|---|---|---|
| **3 天 (72 小時)** | **1 歲 (1 年)** | $1 \text{ 天} = 4 \text{ 個月}$ |
| **1 天 (24 小時)** | **4 個月 (120 天)** | $1 \text{ 小時} = 5 \text{ 天}$ |
| **1 時辰 (2 小時)** | **10 天** | $12 \text{ 分鐘} = 1 \text{ 天}$ |
| **1 小時 (60 分鐘)** | **5 天** | $1 \text{ 分鐘} = 2 \text{ 小時}$ |

### 3. 精確分解數學公式
設時間差總分鐘數為 $M = \lfloor \Delta T / 60000 \rfloor$：
$$\begin{aligned}
\text{TotalDays} &= M / 1440 \\
\text{StartAgeYears} &= \lfloor \text{TotalDays} / 3 \rfloor \\
\text{RemainingDays} &= \text{TotalDays} \bmod 3 \\
\text{StartMonths} &= \lfloor \text{RemainingDays} \times 4 \rfloor \\
\text{RemainingHours} &= (\text{RemainingDays} \times 4 - \text{StartMonths}) \times 30 \times 24 / 120 \\
\text{StartDays} &= \lfloor \text{RemainingHours} \times 5 \rfloor
\end{aligned}$$

---

## 三、工程演算法偽代碼 (Pseudocode)

```typescript
interface DaYunStep {
  stepIndex: number;      // 1 ~ 10
  stem: string;           // 大運天干
  branch: string;         // 大運地支
  startAge: number;       // 起運虛歲 (實歲 = startAge - 1)
  startYear: number;      // 起運公曆年份
  endYear: number;        // 結束公曆年份
}

function calculateDaYun(
  birthDate: Date, 
  gender: 'male' | 'female', 
  yearStem: string, 
  monthStem: string, 
  monthBranch: string
): { startAge: number; steps: DaYunStep[] } {
  // 1. 判定順逆
  const isYangYear = ['甲','丙','戊','庚','壬'].includes(yearStem);
  const isForward = (isYangYear && gender === 'male') || (!isYangYear && gender === 'female');

  // 2. 獲取相鄰節令時刻 (高精度 VSOP87D / 天文演算法)
  const prevJie = getPrevJieTermSolar(birthDate);
  const nextJie = getNextJieTermSolar(birthDate);
  
  // 3. 計算時間跨度 (毫秒)
  const deltaMs = isForward 
    ? nextJie.getTime() - birthDate.getTime() 
    : birthDate.getTime() - prevJie.getTime();

  // 4. 精確折算為起運年歲
  const totalDays = deltaMs / (1000 * 60 * 60 * 24);
  const startAgeYears = Math.max(1, Math.round(totalDays / 3)); // 傳統四捨五入或截斷整年

  // 5. 排定 10 步大運干支
  const steps: DaYunStep[] = [];
  let curStemIdx = HEAVENLY_STEMS.indexOf(monthStem);
  let curBranchIdx = EARTHLY_BRANCHES.indexOf(monthBranch);

  for (let i = 1; i <= 10; i++) {
    if (isForward) {
      curStemIdx = (curStemIdx + 1) % 10;
      curBranchIdx = (curBranchIdx + 1) % 12;
    } else {
      curStemIdx = (curStemIdx - 1 + 10) % 10;
      curBranchIdx = (curBranchIdx - 1 + 12) % 12;
    }

    const stepStartYear = birthDate.getFullYear() + startAgeYears + (i - 1) * 10;
    steps.push({
      stepIndex: i,
      stem: HEAVENLY_STEMS[curStemIdx],
      branch: EARTHLY_BRANCHES[curBranchIdx],
      startAge: startAgeYears + (i - 1) * 10,
      startYear: stepStartYear,
      endYear: stepStartYear + 9
    });
  }

  return { startAge: startAgeYears, steps };
}
```

---

## 四、邊界場景與極端情況處理規範

### 1. 早子時與晚子時（夜子時）邊界
- **定義**：23:00 ~ 24:00 為晚子時（夜子時），00:00 ~ 01:00 為早子時；
- **日柱界定**：平台嚴格遵循主流標準——**23:00 即換日柱干支**；
- **節氣交節時間差計算**：計算 $\Delta T$ 時，使用經過經緯度真太陽時校正後的物理精確時間戳，避免因跨日導致時間差出現 $\pm 24$ 小時的階躍誤差。

### 2. 出生時刻與交節時刻重合（$\Delta T < 1\text{ 小時}$）
- 當用戶出生在節令交接地點的數分鐘之內時，計算得出的起運時間可能趨近於 0 歲（出生即起運）；
- **工程下限保證**：系統底層強制 `startAge = Math.max(1, calculatedAge)`，確保第一步大運起運年齡不小於 1 虛歲，防止大運卡片渲染年齡段重疊。

### 3. 真太陽時校正對大運方向的極限翻轉
- 某些案例公曆出生時間在立春交節前 5 分鐘，但經當地偏東經度校正後，真太陽時越過立春點；
- **排盤規範**：以**校正後的真太陽時**為唯一判斷依據。若真太陽時跨過節令，則年柱更換、月柱更換，交節倒推點與下一個節令點亦隨之重置。

---

## 五、基準測試對標向量 (Test Vectors)

以下基準案例被納入系統 CI 回歸測試套件（`src/lib/__tests__/baziCrossValidation.test.ts`）：

| 測試用例 | 出生時間 (公曆) | 性別 | 判定結果 | 起運年齡 (虛歲) | 第一步大運 |
|---|---|---|---|---|---|
| **Case 1: 陽男順行** | 1994-02-26 04:15 (甲戌年丁卯月) | 男 | 順行 (至驚蟄) | 3 歲 | 戊辰 (1996起) |
| **Case 2: 陰女順行** | 2013-07-13 16:17 (癸巳年己未月) | 女 | 順行 (至立秋) | 8 歲 | 庚申 (2021起) |
| **Case 3: 陰男逆行** | 1989-04-07 04:00 (己巳年戊辰月) | 男 | 逆行 (至清明) | 1 歲 | 丁卯 (1989起) |
