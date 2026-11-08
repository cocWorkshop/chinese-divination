# BaZi Gold Standard Interpretation — V2 Schema & Evaluation Rubric

> **Status**: Ground Truth Benchmark & Quality Rubric  
> **Natal Chart Parameters**: 1990-01-15 Wu hour (11:00-13:00), Male, Beijing  
> **Four Pillars Gan-Zhi**: Ji-Si Year, Ding-Chou Month, Geng-Chen Day, Ren-Wu Hour  
> **Day Master State**: Geng Metal (Yang Metal), balanced-to-strong, born in the cold winter of Chou month  
> **Formation Determination**: Direct Officer Formation (Officer and Seal mutual generation; Ding Fire Direct Officer penetrates Month stem, Ji Earth Direct Seal penetrates Year stem)  
> **Target Schema**: `src/app/api/divination/schemas/bazi.schema.ts` (V2)

---

## 1. Architectural Quality Rubric

Evaluating whether a BaZi interpretation achieves "production-grade gold standard" status uses the following four-dimension scoring matrix (Total: 100 points; $\ge 90$ points: Gold Standard, 75-89 points: Passing, $<75$ points: Defect / Re-evaluation):

| Evaluation Dimension | Weight | Core Criteria | Red Flags |
|---|---|---|---|
| **Dim 1: Metaphysical Rigor** | 35% | All judgments must cite objective natal chart evidence (Ten Gods revealed/hidden, Five Element interactions, month commander allocations, climatic regulators, clashes/combinations/harms/punishments). | Vacuous claims (e.g., "You have good fortune" without referencing Geng Metal in Chou month or Ding Fire in stem), inaccurate Five Element strengths. |
| **Dim 2: Temporal Specificity** | 25% | Decadal fortune analysis provides specific Gan-Zhi, age ranges, and calendar years; key annual horizons specify exact years (e.g., 2027 Yi-Si) with causal rationale. | Absence of annual horizons, vague generalities ("later in life", "sometime in the future"), conflating annual and decadal Gan-Zhi. |
| **Dim 3: Modern Relevance** | 25% | Translates classical maxims (e.g., Officer-Seal generation, Eating God draining brilliance) into modern career paths, relationship dynamics, and wealth management, providing psychological empowerment. | Unexplained archaic quotes, fatalistic fear-mongering ("catastrophe is certain"), outdated feudal civil-service preachiness. |
| **Dim 4: Contract Compliance** | 15% | 100% adherence to V2 JSON Schema field constraints, adequate text length, zero unclosed or malformed attributes. | Missing `sections` child properties, incomplete decadal fortune array length, JSON parse failures. |

---

## 2. Benchmark Output Data (V2 Schema Output)

```json
{
  "type": "bazi",
  "version": 2,
  "formation": {
    "name": "Direct Officer Formation (Officer and Seal Mutual Generation)",
    "analysis": "The Month Commander is Chou Earth, with Hidden Stem command showing Xin Metal in authority. Ding Fire Direct Officer penetrates the Month stem, while Ji Earth Direct Seal penetrates the Year stem, creating an immediate and unimpeded circulation (Ding -> Ji -> Geng). This constitutes a superior Officer-and-Seal configuration as praised in Zi Ping Zhen Quan. The structure signifies integrity, organizational executive talent, and strong alignment with institutional governance or major enterprise management."
  },
  "seasonalNote": "Geng Metal is born in Chou month (deep winter). In accordance with the Qiong Tong Bao Jian: 'When Geng Metal is born in Chou month, prioritize Ding Fire.' Ding Fire penetrating the Month stem warms the natal chart effectively. Without Ding Fire, the metal remains frozen and water chilled, making personal potential difficult to realize.",
  "sections": {
    "overview": "The Day Master is Geng Metal, born in the Ji-Si year, Ding-Chou month, Geng-Chen day, and Ren-Wu hour. Geng Metal is Yang Metal, carrying the decisive, unyielding clarity of autumn air, characterized by courage, loyalty, and trustworthiness. The core formation centers on Direct Officer (Ding Fire) generating Direct Seal (Ji Earth), flowing smoothly into the Day Master to foster upright leadership and structured management talent. Ji Earth Direct Seal in the Year stem reflects disciplined parental upbringing and structured foundations. Ren Water Eating God in the Hour stem drains brilliance, indicating expressive agility and creative foresight that flourish in mature years.\n\nSitting on Chen Earth (Wax Metal) in the Nourishing state provides solid ground. Chen holds Wu (Indirect Seal), Yi (Direct Wealth), and Gui (Hurting Officer)—a nuanced Spouse Palace indicating a supportive, pragmatic partner whose strength is understated rather than boastful. Chou and Wu branches form a Mutual Harm (Chou-Wu Harm), indicating subtle tensions between professional obligations and personal domestic peace requiring conscious balance. The Day Pillar carries Tian De and Yue De auspicious stars, granting strong resilience to turn adversity into triumph.\n\nLife Palace is Jia-Xu (Mountaintop Fire), fostering an innate drive toward material prosperity; Body Palace is Ren-Shen (Sword-edge Metal), utilizing talent and skill to secure achievement. Fetal Origin is Wu-Chen (Great Forest Wood), providing robust inherent vitality.",
    "career": "With an Officer-Seal Mutual Generation formation, the native thrives in structured, hierarchical organizations. Ding Fire represents legitimate authority, while Ji Earth represents credentialed expertise—combining naturally toward financial law, enterprise executive leadership, public sector governance, IT infrastructure/hardware (Metal industries), education management, and civil engineering (Earth industries). Ren Water Eating God in the Hour pillar also supports high-level technical advisory, system architecture, and specialized engineering roles.\n\nThe Month Pillar unites Tian Yi Nobleman, State Seal Nobleman, and Hua Gai, indicating mentorship from authoritative seniors between ages 17 and 32. Hua Gai highlights natural scholarly and research depth. Under the current Gui-You Decadal Fortune (2024-2033), the Si-You-Chou Three Metal Combination reaches completion, marking a peak career expansion phase. With Gui Water Hurting Officer revealed in the stem, temper speech when dealing with superiors: let measurable results speak louder than critique.",
    "marriage": "For a male chart, Wealth stars represent the spouse: Yi Wood Direct Wealth is stored within the Day branch Chen, entering the Spouse Palace without penetrating the Heavenly Stems—indicating an observant, grounded partner who contributes quietly and effectively. Sitting in the Nourishing state suggests gradual emotional deepening: starting calmly and growing richer over time. The Chou-Wu Harm (Month to Hour) suggests that demanding career cycles can encroach upon domestic presence if not consciously managed.\n\nMarriage Timing Windows: In the 4th Decadal Fortune Gui-You (2024-2033), You serves as the Prosperity stage for the spouse element, favoring relational stability. The year 2027 (Yi-Si, Direct Wealth revealed and echoing the Year Pillar) brings pivotal emotional milestones. The year 2029 (Gui-Mao, Mao-You clash) introduces relational turbulence requiring patience. The Peach Blossom star sits in the Hour Pillar (Wu), indicating late-blooming charisma that deepens in mature years.",
    "wealth": "Yi Wood Direct Wealth is stored in Chen Earth—characterizing an earner whose wealth accumulates steadily through professional remuneration and asset equity rather than speculative gambling. Jia Wood Indirect Wealth does not reveal, suggesting moderate speculative fortunes. Metal represents the favorable element, making earnings in finance, hardware, and structured corporate operations most lucrative.\n\nFinancial Trajectory: During the Jia-Xu Decadal Fortune (ages 24-33), Indirect Wealth revealed investment openings alongside substantial expenditure. The Gui-You Decadal Fortune (ages 34-43) completes the Three Metal Combination, initiating a primary wealth accumulation zenith, particularly amplified in 2027 (Yi-Si). The Ren-Shen Decadal Fortune (ages 44-53) utilizes Eating God generating Wealth, marking an optimal monetization era for specialized expertise and advisory consulting. Financial strategy should prioritize diversified capital preservation over excessive leverage or futures trading.",
    "health": "The Day Master is Geng Metal, which governs lungs, large intestine, respiratory vitality, and skin. Born in Chou month (cold metal) counterbalanced by Wu hour (fire restriction), winter respiratory defenses require proactive care. Earth weighting (2.6) risks smothering metal: overly sluggish spleen/stomach digestion can reflect outwardly as dermatological sensitivities. Fire weighting (2.3) restricts metal, advising steady vigilance over cardiovascular stamina and eyesight.\n\nRisk Periods: The Geng-Wu Decadal Fortune (ages 64-73) introduces double Wu-Wu Self-Punishment and Fire clashing Metal, highlighting cardiovascular and respiratory vulnerability. Health Preservation: Emphasize Metal-Water replenishment—swimming, nourishing lung hydration through dietary balance, and living orientations favoring West or North."
  },
  "daYunAnalysis": [
    {
      "stem": "Bing", "branch": "Zi",
      "startAge": 4, "endAge": 13, "startYear": 1994, "endYear": 2003,
      "theme": "Seven Killings Bing Fire sitting on Zi Water, transitioning into Killings and Seal mutual support. Childhood academic demands bring pressure alongside intellectual progress; individuality emerges.",
      "interactions": "Zi Water serves as the Bathing state for Geng Metal; the branch introduces no disruptive natal clashes.",
      "keyYears": [
        { "year": 1999, "ganZhi": "Gui-You", "event": "Hurting Officer meets Prosperity branch; minor academic adjustments yield broader world perspectives." },
        { "year": 2002, "ganZhi": "Geng-Wu", "event": "Friend star sits on Peach Blossom; social awareness awakens." }
      ],
      "advice": "Focus primarily on foundational study and cultivate independent analytical thinking."
    },
    {
      "stem": "Yi", "branch": "Hai",
      "startAge": 14, "endAge": 23, "startYear": 2004, "endYear": 2013,
      "theme": "Direct Wealth Yi Wood reveals + Hai Water acts as Hurting Officer's vitality branch. Youthful educational advancement; growing economic consciousness and practical talent.",
      "interactions": "Hai holds Ren Water Eating God and Jia Wood Indirect Wealth, clashing with natal Si Fire (Si-Hai Clash)—affecting the Year Pillar and prompting family or residential moves.",
      "keyYears": [
        { "year": 2011, "ganZhi": "Xin-You", "event": "Rob Wealth Imperial Prosperity; the Si-You-Chou Three Metal Combination forms for the first time, marking a major turning point." },
        { "year": 2012, "ganZhi": "Geng-Shen", "event": "Friend sits on Prosperity; personal capabilities receive formal recognition." }
      ],
      "advice": "Favorable for advanced degree attainment and career initiation; remain attentive to domestic shifts during clash years."
    },
    {
      "stem": "Jia", "branch": "Xu",
      "startAge": 24, "endAge": 33, "startYear": 2014, "endYear": 2023,
      "theme": "Indirect Wealth Jia Wood + Xu Fire Treasury. Foundational career building period; strong entrepreneurial instincts bring abundant opportunities accompanied by intense competition.",
      "interactions": "Xu stores Ding Fire, Xin Metal, and Wu Earth, clashing with natal Chen Earth (Chen-Xu Clash)—the Day Branch clash brings relational and romantic fluctuations.",
      "keyYears": [
        { "year": 2017, "ganZhi": "Yi-Mao", "event": "Direct Wealth sits on strong Mao Wood roots; major breakthrough in personal wealth and partnerships." },
        { "year": 2021, "ganZhi": "Xin-Hai", "event": "Rob Wealth plus Hurting Officer; competitive friction prompts career adjustments or lateral shifts." }
      ],
      "advice": "Solidify professional capital; avoid impulsive partnerships or unhedged financial speculation."
    },
    {
      "stem": "Gui", "branch": "You",
      "startAge": 34, "endAge": 43, "startYear": 2024, "endYear": 2033,
      "theme": "Hurting Officer Gui Water + You Metal Imperial Prosperity. The Si-You-Chou Three Metal Combination reaches full maturity, dramatically empowering the Day Master. A harvest decade for career and capital.",
      "interactions": "You Metal provides Imperial Prosperity to Geng Metal and completes the Si-You-Chou Metal Combination; You and Chen form Chen-You Metal combination, further compounding metal vitality.",
      "keyYears": [
        { "year": 2027, "ganZhi": "Yi-Si", "event": "Direct Wealth reveals while echoing the natal Year Pillar; exceptional financial harvest or major life milestone." },
        { "year": 2029, "ganZhi": "Gui-Mao", "event": "Hurting Officer sits on Mao, triggering Mao-You clash; dynamic shift year involving relocation or role change." }
      ],
      "advice": "A pinnacle decade of life: maximize breakthroughs across 2027-2028. Maintain humble communication and let tangible results speak."
    },
    {
      "stem": "Ren", "branch": "Shen",
      "startAge": 44, "endAge": 53, "startYear": 2034, "endYear": 2043,
      "theme": "Eating God Ren Water + Shen Metal Prosperity branch. Eating God controls Killings while Day Master sits on personal vitality; golden window for monetizing intellectual capital and advisory consulting.",
      "interactions": "Shen and natal Si form Si-Shen combination transforming to Water—Direct Officer softens while personal autonomy expands. Ren Water Eating God drains brilliance fluently.",
      "keyYears": [
        { "year": 2035, "ganZhi": "Ding-You", "event": "Direct Officer meets Imperial Prosperity; executive elevation or major industry honors." },
        { "year": 2038, "ganZhi": "Jia-Wu", "event": "Indirect Wealth sits on Wu Fire; lucrative investment opportunities requiring prudent diligence." }
      ],
      "advice": "Transition toward knowledge-driven ventures: writing, consulting, mentoring. Keep financial structures steady."
    },
    {
      "stem": "Xin", "branch": "Wei",
      "startAge": 54, "endAge": 63, "startYear": 2044, "endYear": 2053,
      "theme": "Rob Wealth Xin Metal + Wei Earth. Rob Wealth reveals, increasing competitive friction; safeguard against joint venture losses while relying on accumulated capital.",
      "interactions": "Wei and natal Chou form Chou-Wei Clash—the Month Pillar experiences movement in professional environment. Xin Metal competes for wealth.",
      "keyYears": [
        { "year": 2047, "ganZhi": "Yi-You", "event": "Direct Wealth meets Imperial Prosperity; mature-phase wealth shows strong resilience." },
        { "year": 2049, "ganZhi": "Gui-Si", "event": "Hurting Officer echoes Year Pillar; a reflective year of consolidation." }
      ],
      "advice": "Avoid informal financial partnerships; operate independently. Navigate organizational shifts gracefully."
    },
    {
      "stem": "Geng", "branch": "Wu",
      "startAge": 64, "endAge": 73, "startYear": 2054, "endYear": 2063,
      "theme": "Friend Geng Metal + Wu Fire restricting Geng Metal directly. The most sensitive health decade, with Wu-Wu Self-Punishment amplifying internal heat.",
      "interactions": "Wu combines with natal Wu in the Hour branch to form Wu-Wu Self-Punishment. Wu Fire Seven Killings directly challenges Day Master vitality.",
      "keyYears": [
        { "year": 2056, "ganZhi": "Bing-Zi", "event": "Seven Killings meets Bathing state; prioritize comprehensive preventive medical screenings." },
        { "year": 2062, "ganZhi": "Geng-Wu", "event": "Heaven and Earth clash and echo; exercise greatest lifestyle prudence." }
      ],
      "advice": "Establish consistent daily exercise and annual health checkups after age 50. Safeguard cardiovascular and respiratory health."
    },
    {
      "stem": "Ji", "branch": "Si",
      "startAge": 74, "endAge": 83, "startYear": 2064, "endYear": 2073,
      "theme": "Direct Seal Ji Earth + Si Fire. Returning to the natal Year Pillar Ji-Si, fostering life reflection. Direct Seal protects while descendants provide care. Ideal for peaceful contemplation.",
      "interactions": "Ji-Si directly echoes the natal Year Pillar (Fu Yin). Si holds Bing Fire and Geng Metal; physical stamina fluctuates but Seal protects.",
      "keyYears": [
        { "year": 2067, "ganZhi": "Yi-Chou", "event": "Direct Wealth echoes Month Pillar; warm domestic gatherings." },
        { "year": 2071, "ganZhi": "Xin-You", "event": "Rob Wealth Imperial Prosperity; Metal combination re-energizes vitality and spirit." }
      ],
      "advice": "Embrace tranquility, scholarly study, or philosophical exploration. Hua Gai in the chart invites deep spiritual enrichment."
    }
  ],
  "branchAnalysis": "Across the four natal branches (Si, Chou, Chen, Wu), Chou in the month and Wu in the hour form a Chou-Wu Mutual Harm—creating subtle underlying friction between career demands (Month Pillar) and family/children (Hour Pillar), suggesting heavy workloads in mature years may encroach upon home presence. Positively, the chart contains zero Six Clashes and zero Three Punishments, remaining harmoniously stable. Furthermore, Si and Chou already constitute two-thirds of the Si-You-Chou Three Metal Combination, which the Gui-You Decadal Fortune (ages 34-43) completes, marking the pinnacle epoch of life.",
  "keyAdvice": [
    "2024-2033 (Gui-You Decadal Fortune) is the definitive career decade: the Three Metal Combination matures into peak productivity. Focus strategic efforts on 2027-2028. Hurting Officer revealed advises gentle interpersonal tact—let competence speak for itself.",
    "Career Path in Finance, Law, or Enterprise Infrastructure: An Officer-Seal Mutual Generation structure thrives best in established systems. The window before age 34 is ideal for finalizing positioning.",
    "Cultivate Relational Presence: With the spouse star resting in the Day Branch alongside Chou-Wu Harm, demanding work routines can distract from family life. Intentionally allocate dedicated quality time.",
    "Prioritize Cardiovascular & Respiratory Wellness Beyond Age 64: The Geng-Wu cycle brings Wu-Wu Self-Punishment and Fire restricting Metal. Begin proactive cardiovascular and lung maintenance in your 50s.",
    "Preserve Capital via Structured Vehicles: Direct Wealth structures reward consistent earnings and stable growth assets. In the Ren-Shen decade (ages 44-53), explore advisory consulting and knowledge-based avenues."
  ],
  "luckyInfo": {
    "colors": ["White", "Silver", "Gold"],
    "directions": ["West", "North"]
  }
}
```
