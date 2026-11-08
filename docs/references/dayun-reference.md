# Decadal Fortune (DaYun) Algorithmic Engineering Specification

> **Version**: v2.0 (Engineering Baseline Specification)  
> **Maintainer**: Metaphysical Algorithms & Core Architecture Group  
> **Code Alignment**: [`src/lib/baziCalculator.ts`](file:///c:/Users/DaZWe/Developer/chinese-divination-dev/src/lib/baziCalculator.ts) and [`src/lib/__tests__/baziCrossValidation.test.ts`](file:///c:/Users/DaZWe/Developer/chinese-divination-dev/src/lib/__tests__/baziCrossValidation.test.ts)

---

## 1. Algorithmic Theoretical Foundations & Astronomical Calendar Definitions

In BaZi destiny analysis, Decadal Fortune (Da Yun) represents the decimal time-series trajectory governing individual life phases in 10-year increments. Mathematically, it derives from the **cyclical forward or reverse progression of the Month Pillar's Heavenly Stem and Earthly Branch based on gender and Year Stem polarity**, with start and handover times determined by **the astronomical time span between birth and the adjacent solar term boundary**.

### 1. Directional Ordering Rules
- **Base Axis**: Uses the natal **Month Pillar** Heavenly Stem and Earthly Branch as the baseline starting point, incrementing forward or decrementing backward;
- **Directional Determination Matrix**:
  $$\text{Direction} = \begin{cases} 
  \text{Forward}, & (\text{YearStem} \in \{\text{Jia, Bing, Wu, Geng, Ren}\} \land \text{Gender} = \text{Male}) \lor (\text{YearStem} \in \{\text{Yi, Ding, Ji, Xin, Gui}\} \land \text{Gender} = \text{Female}) \\
  \text{Backward}, & (\text{YearStem} \in \{\text{Yi, Ding, Ji, Xin, Gui}\} \land \text{Gender} = \text{Male}) \lor (\text{YearStem} \in \{\text{Jia, Bing, Wu, Geng, Ren}\} \land \text{Gender} = \text{Female})
  \end{cases}$$

### 2. Solar Term Boundaries (Major Solar Terms / Jie Only)
Start calculations strictly use the **12 Major Solar Terms (Jie)** as astronomical markers; the 12 Minor Terms (Qi) do not participate in cycle initiation boundaries:
- **12 Major Solar Term Markers**: Lichun (Yin month), Jingzhe (Mao month), Qingming (Chen month), Lixia (Si month), Mangzhong (Wu month), Xiaoshu (Wei month), Liqiu (Shen month), Bailu (You month), Hanlu (Xu month), Lidong (Hai month), Daxue (Zi month), Xiaohan (Chou month).

---

## 2. Decadal Fortune Calculation Mathematical Model

### 1. Astronomical Time Span $\Delta T$ Definition
Let birth time be $T_{\text{birth}}$ (millisecond-precision True Solar Time timestamp):
- **Forward Progression**: $\Delta T = T_{\text{next\_jie}} - T_{\text{birth}}$ (calculated from birth to the **subsequent Major Solar Term** instant);
- **Backward Progression**: $\Delta T = T_{\text{birth}} - T_{\text{prev\_jie}}$ (calculated backward from birth to the **preceding Major Solar Term** instant).

### 2. Traditional Conversion Constants
Traditional metaphysics uses an idealized model of "360 days in a year, 30 days per solar term", corresponding to 36,000 days of human life:

| Astronomical Span ($\Delta T$) | Equivalent Decadal Age | Conversion Ratio |
|---|---|---|
| **3 Days (72 Hours)** | **1 Year (Age)** | $1 \text{ Day} = 4 \text{ Months}$ |
| **1 Day (24 Hours)** | **4 Months (120 Days)** | $1 \text{ Hour} = 5 \text{ Days}$ |
| **1 Shichen (2 Hours)** | **10 Days** | $12 \text{ Minutes} = 1 \text{ Day}$ |
| **1 Hour (60 Minutes)** | **5 Days** | $1 \text{ Minute} = 2 \text{ Hours}$ |

### 3. Precise Mathematical Formulas
Let total elapsed minutes be $M = \lfloor \Delta T / 60000 \rfloor$:
$$\begin{aligned}
\text{TotalDays} &= M / 1440 \\
\text{StartAgeYears} &= \lfloor \text{TotalDays} / 3 \rfloor \\
\text{RemainingDays} &= \text{TotalDays} \bmod 3 \\
\text{StartMonths} &= \lfloor \text{RemainingDays} \times 4 \rfloor \\
\text{RemainingHours} &= (\text{RemainingDays} \times 4 - \text{StartMonths}) \times 30 \times 24 / 120 \\
\text{StartDays} &= \lfloor \text{RemainingHours} \times 5 \rfloor
\end{aligned}$$

---

## 3. Engineering Pseudocode

```typescript
interface DaYunStep {
  stepIndex: number;      // 1 ~ 10
  stem: string;           // Da Yun Heavenly Stem
  branch: string;         // Da Yun Earthly Branch
  startAge: number;       // Nominal start age (Sui, actual age = startAge - 1)
  startYear: number;      // Gregorian start calendar year
  endYear: number;        // Gregorian end calendar year
}

function calculateDaYun(
  birthDate: Date, 
  gender: 'male' | 'female', 
  yearStem: string, 
  monthStem: string, 
  monthBranch: string
): { startAge: number; steps: DaYunStep[] } {
  // 1. Determine direction
  const isYangYear = ['Jia', 'Bing', 'Wu', 'Geng', 'Ren'].includes(yearStem);
  const isForward = (isYangYear && gender === 'male') || (!isYangYear && gender === 'female');

  // 2. Fetch adjacent Major Solar Term timestamps (High precision VSOP87D / astronomy algorithm)
  const prevJie = getPrevJieTermSolar(birthDate);
  const nextJie = getNextJieTermSolar(birthDate);
  
  // 3. Compute time delta (milliseconds)
  const deltaMs = isForward 
    ? nextJie.getTime() - birthDate.getTime() 
    : birthDate.getTime() - prevJie.getTime();

  // 4. Precision conversion to start age
  const totalDays = deltaMs / (1000 * 60 * 60 * 24);
  const startAgeYears = Math.max(1, Math.round(totalDays / 3)); // Traditional rounding

  // 5. Compute 10 decadal steps
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

## 4. Boundary Scenarios & Edge Cases

### 1. Early Zi (00:00-01:00) vs Late Zi (23:00-24:00) Boundaries
- **Definition**: 23:00-24:00 is Late Zi hour (Ye Zi), 00:00-01:00 is Early Zi hour (Zao Zi);
- **Day Pillar Invariant**: The platform adheres to the mainstream consensus standard: **the Day Pillar stem and branch transitions at 23:00**;
- **Solar Term Delta**: When calculating $\Delta T$, timestamps are calculated in physical True Solar Time coordinates, preventing $\pm 24$-hour boundary offset errors.

### 2. Birth Moment Coinciding with Solar Term Handover ($\Delta T < 1\text{ Hour}$)
- When a user is born within minutes of a solar term boundary, the calculated initiation time approaches 0 years old (initiating immediately at birth);
- **Lower Bound Guarantee**: The engine enforces `startAge = Math.max(1, calculatedAge)` to ensure the first decadal pillar starts at nominal age $\ge 1$, preventing negative or overlapping age segments in the UI.

### 3. True Solar Time Inversion Across Solar Term Cutoffs
- If a birth occurs 5 minutes before Lichun in local clock time, but True Solar Time adjustment advances it past the Lichun threshold:
- **Standard**: **Corrected True Solar Time** is the authoritative criterion. Crossing the solar term boundary shifts Year and Month pillars accordingly, resetting solar term calculation anchors.

---

## 5. Verification Test Vectors

The following baseline test cases are locked into CI regression suites (`src/lib/__tests__/baziCrossValidation.test.ts`):

| Test Case | Birth Time (Gregorian) | Gender | Direction | Start Age (Nominal) | First Da Yun Pillar |
|---|---|---|---|---|---|
| **Case 1: Yang Male Forward** | 1994-02-26 04:15 (Jia-Xu Year Ding-Mao Month) | Male | Forward (to Jingzhe) | 3 | Wu-Chen (Starts 1996) |
| **Case 2: Yin Female Forward** | 2013-07-13 16:17 (Gui-Si Year Ji-Wei Month) | Female | Forward (to Liqiu) | 8 | Geng-Shen (Starts 2021) |
| **Case 3: Yin Male Backward** | 1989-04-07 04:00 (Ji-Si Year Wu-Chen Month) | Male | Backward (to Qingming) | 1 | Ding-Mao (Starts 1989) |
