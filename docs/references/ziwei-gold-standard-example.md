# Zi Wei Dou Shu Gold Standard Output — V2 Schema & Evaluation Rubric

> **Status**: Ground Truth Benchmark & Quality Rubric  
> **Natal Parameters**: 1990-01-15 Wu hour (11:00-13:00), Male  
> **Bureau & Governing Stars**: Earth 5 Bureau | Life Master: Wuqu | Body Master: Tianji | Life Palace in Wei (Life and Body co-located)  
> **Life Palace Primary Stars**: Empty Life Palace (no primary stars), borrowing opposite Chou palace Taiyang (Dim) and Taiyin (Temple)  
> **Birth Si Hua Mutagens**: Wuqu Hua Lu (Servant Palace), Tanlang Hua Quan (Health Palace), Tianliang Hua Ke (Spouse Palace), Wenqu Hua Ji (Property Palace)  
> **Formation Characteristics**: Ji-Yue-Tong-Liang formation, Empty Life Palace formation, Fu-Xiang flanking assembly, Servant Palace causal chain  
> **Target Schema**: `src/app/api/divination/schemas/ziwei.schema.ts` (V2)

---

## 1. Architectural Quality Rubric

Evaluating whether a Zi Wei Dou Shu interpretation achieves "production-grade gold standard" status uses the following four-dimension scoring matrix (Total: 100 points; $\ge 90$ points: Gold Standard, 75-89 points: Passing, $<75$ points: Defect / Re-evaluation):

| Evaluation Dimension | Weight | Core Criteria | Red Flags |
|---|---|---|---|
| **Dim 1: Star Mutagens & Causal Chains** | 35% | Derives causal relationships from star brightness across the Three Parties and Four Adjacent Palaces, linking birth Si Hua with palace flying transformations (e.g. self-transformation, Hua Ji clashing opposite palaces). | Isolated analysis of single palaces, ignoring star brightness/trap states, superficial Si Hua lists without dynamic progression. |
| **Dim 2: Psychological Shadow & Depth** | 25% | Probes psychological dynamics between Life Palace (external persona) vs. Happiness Palace (inner emotional core), revealing people-pleasing tendencies, anxiety drivers, and spiritual anchors. | Caricatured personality stereotypes ("you are cheerful"), lack of internal motivation analysis, absence of deep empathy. |
| **Dim 3: Temporal Specificity** | 25% | Decadal cycles (Da Xian) incorporate decadal stem Si Hua mutagens, anchoring key milestones to explicit causal factors. | Omitting decadal Si Hua overlays, vague age ranges, annual predictions lacking star rationale. |
| **Dim 4: Contract Compliance** | 15% | 100% adherence to V2 JSON Schema field constraints, including `formation`, 12-palace analysis, decadal analysis array, core recommendations, and auspicious coordinates. | Missing `sections.personality`, malformed JSON nesting. |

---

## 2. Benchmark Output Data (V2 Schema Output)

```json
{
  "type": "ziwei",
  "version": 2,

  "formation": {
    "name": "Empty Life Palace with Ji-Yue-Tong-Liang Influence",
    "level": "Medium Tier",
    "analysis": "The Life Palace in Wei contains none of the 14 Primary Stars, borrowing from the opposite Chou palace Taiyang (Dim) and Taiyin (Temple)—a borrowed star architecture where Yin dominates Yang. Across the Three Parties and Four Adjacent Palaces, Tianji (Prosperous), Jumen (Temple), and Tiantong (Temple) assemble into the Ji-Yue-Tong-Liang structure, favorable for administrative and analytical research careers. Zuofu and Youbi assist from Wealth and Career palaces, while Tiankui and Tianyue provide noble support, elevating the baseline grade. Life and Body palaces are co-located in Wei, aligning inner intent with outer action. Overall Rating: Upper-Medium Tier—though baseline Empty Life Palaces start lower, triple auxiliary star support elevates practical real-world execution to solid medium-tier standing."
  },

  "sections": {
    "overview": "The native belongs to the Earth 5 Bureau with Life and Body palaces co-located in Wei. The Life Palace lacks Primary Stars, borrowing Taiyang (Dim) and Taiyin (Temple) from the opposite palace. Taiyin's temple brilliance predominates, creating a structure where receptivity exceeds assertiveness: observational sensitivity outstrips outward display, and the inner mental landscape is far richer than what is shown externally.\n\nThe Life Palace hosts Qingyang (Temple brilliance) alone—a double-edged sword. Qingyang introduces fierce competitive resilience and decisive courage in critical junctures, alongside latent impulsiveness and friction with peers. Blended with borrowed Taiyin, it creates an 'iron hand in a velvet glove' demeanor: calm and accommodating in ordinary moments, yet unyielding when core boundaries are crossed.\n\nBirth year Si Hua reveals the native's lifelong macro themes: Wuqu Hua Lu in the Servant Palace indicates that **social capital is financial capital**—the greatest asset lies in human networks rather than isolated technical skills; Tanlang Hua Quan in the Health Palace reflects abundant physical drive requiring disciplined temperance; Tianliang Hua Ke in the Spouse Palace indicates an educated partner within a turbulent marital palace (meeting Dikong, Dijie, and Tuoluo); Wenqu Hua Ji in the Property Palace flags real estate contracts and titles as primary risk areas.\n\nCausal Flying Mutagen Chain: Servant Palace Hua Lu (wealth via networks) -> Servant Palace Bing stem flies Lianzhen Hua Ji into Parents Palace -> indicating that 'monetizing social networks may generate tension with seniors or familial expectations'. This chain cautions the native to maintain familial transparency while pursuing entrepreneurial ventures.\n\nRetrospective Verification: Between ages 15-24 (Decadal Fortune through Siblings Palace with Qisha and Lucun), the native exhibited a strong awakening of self-reliance and financial independence—confirming chart orientation if early departure from home or independent livelihood occurred during this window.",

    "personality": "External Persona (Life Palace): Borrowing Taiyang and Taiyin into an empty palace grants extraordinary situational adaptability—displaying distinct facets across different audiences. This is not disingenuousness, but rather Taiyin's empathetic resonance tuning naturally to others' emotional frequencies. Taiyin in temple brilliance fosters gentle tact, emotional intuition, and keen observation. Qingyang co-located injects internal grit: outwardly courteous, yet intensely capable of surprising tenacity when competition demands.\n\nInner Emotional Core (Happiness Palace): Happiness Palace in You is also devoid of Primary Stars, hosting Huoxing (Beneficial stage) alone—the primary psychological vulnerability of the chart. The Happiness Palace represents spiritual equilibrium; lacking a primary star indicates an anchorless inner core. Huoxing induces restless mental agitation: chronic anxious loops, difficulty resting, and sensitive sleep quality. The stronger the outward adaptation (Taiyin in Life), the steeper the inner emotional depletion (Empty Happiness Palace). Guidance: Cultivate contemplative, philosophical, or meditative routines to anchor the internal world.\n\nLife Palace vs. Happiness Palace Disparity: This contrast represents the defining psychological dynamic—outwardly conveying serene composure (borrowed Taiyin), yet inwardly harboring self-doubt and restless vigilance (Empty Happiness Palace with Huoxing). Over time, this may foster people-pleasing tendencies or excessive suppression of personal needs. Recognizing this contrast is the essential first step toward sustainable emotional balance.",

    "career": "Career Palace (Hai): Tiantong (Temple) + Youbi + Tianma. Tiantong in temple brilliance represents harmonious operational grace—thriving best in structured, secure institutions (multinational corporations, public institutions, established enterprises), and advising against solitary early-stage startups. Tiantong values process fulfillment over ruthless outcome pressure, experiencing severe fatigue under cutthroat KPI regimens. Youbi indicates capable assistants. Tianma introduces mobile dynamics: business travel, regional relocations, or cross-city engagements.\n\nWealth Palace (Mao): Tianji (Prosperous) + Jumen (Temple) + Zuofu. This is the intellectual crown jewel of the entire chart. Tianji and Jumen together form the classic 'Master Analyst' pairing—eloquent, logically rigorous, and gifted at extracting structural patterns from ambiguous data. Tianji provides intellectual speed, Jumen provides compelling articulation, and Zuofu supplies collaborative leverage. Optimal career alignments: management consulting, quantitative data analysis, financial analysis, strategic communications, legal counsel, and technical architecture.\n\nJi-Yue-Tong-Liang Career Guidance: Traditionally aligned with organizational administrative governance, modern applications emphasize specialized professional fields governed by systematic standards. Tianma in the Career Palace indicates the native will not remain static in a single city across their lifetime.\n\nWuqu Hua Lu in Servant Palace Implication: Wealth star Hua Lu resides in the network palace rather than Wealth Palace—indicating earnings derive from collaborative joint ventures, executive recommendations, and revenue sharing rather than isolated grind. Actively cultivate professional community networks: join industry associations, attend technical symposiums, and maintain alumni ties.\n\nCareer Rhythm: Ages 15-24 Lucun initiates foundational reserves -> Ages 25-34 Spouse Palace cycle encounters emotional distractions -> Ages 35-44 Ziwei cycle brings career expansion under executive authority -> Ages 45-54 Tianji-Jumen cycle realizes full intellectual monetization.",

    "marriage": "Spouse Palace (Si) is the most challenging sector in the chart—hosting Tianliang (Trap) + Hua Ke + Dikong + Dijie + Tuoluo, concentrating the highest malefic star density across the twelve palaces.\n\nSpouse Attributes: Tianliang Hua Ke indicates an educated, ethical partner likely engaged in supportive vocations (education, medicine, counseling, social enterprise). Tianliang carries an older, mature presence: psychologically older than chronological age, acting as a mentor or protector. Hua Ke bestows cultural refinement and professional respect.\n\nMarital Complexities: Dikong and Dijie in the Spouse Palace introduce sudden emotional detachment: partners drifting distant without warning or unanticipated disruptions in connection. Tuoluo creates prolonged hesitation and lingering entanglements. Tianliang in trap state diminishes protective efficacy: good intentions to care for the other may result in mutual strain.\n\nFlying Mutagen Analysis (Spouse Palace Ji Stem): Ji stem flies Wuqu Hua Lu into Servant Palace—post-marriage, the spouse assists in expanding the native's social network; Ji flies Wenqu Hua Ji into Property Palace—highlighting property and contractual vulnerabilities emerging around marital real estate.\n\nTiming Assessment: Ages 25-34 passes through the Spouse Palace, theoretically activating marriage, yet concentrated malefic stars suggest relationships during this phase serve as refining experiences rather than lifelong unions. Deferring lifelong marital commitments until after age 35 (the Ziwei cycle) offers vastly superior stability—Ziwei Tianxiang attracts mature, grounded partners. Auspicious marriage years: during the Ziwei cycle when Hongluan/Tianxi enter Life or Spouse palaces without conflicting decadal mutagens.\n\nMarital Guidance: (1) Avoid marrying impulsively in late 20s out of age anxiety—this corresponds to peak malefic star volatility; (2) Prioritize an emotionally mature, seasoned partner (Tianliang qualities); (3) Thoroughly clarify financial values and contractual clarity prior to marriage (Dikong, Dijie, and Wenqu Hua Ji cautions).",

    "wealth": "Wealth Palace (Mao) hosts Tianji (Prosperous) + Jumen (Temple) + Zuofu—earning through intellect, analytical deduction, and communication; primary earned income predominates.\n\nTianji's analytical agility identifies financial openings, while Jumen's articulation monetizes insight. This is not an impulsive merchant's wealth palace, but a cerebral professional's treasury. Zuofu provides institutional tools and advisory asset management support.\n\nThree-Palace Cross Assessment:\n- Wealth Palace (Earning Ability): Tianji and Jumen—analytic intelligence and persuasive communication.\n- Happiness Palace (Spending Mindset): Empty with Huoxing—impulsive spending tendencies and fluctuating self-regulation.\n- Property Palace (Accumulation / Real Estate): Pojun (Prosperous) + Wenqu Hua Ji—real estate volatility and high contractual exposure.\n\nStrategic Outlook: Strong earning power paired with modest spontaneous savings discipline and high real estate risk. Lifetime financial philosophy: **maximize high-frequency professional earnings, establish automated savings, and avoid leveraged property speculation**.\n\nWuqu Hua Lu in Servant Palace: Wealth star Hua Lu rests in the social network palace, signaling earnings achieved via collaborative partnerships, client referrals, and strategic alliances. Projects introduced through trusted peers yield far superior returns compared to isolated solo efforts.\n\nWealth Timeline:\n- Ages 15-24: Lucun in Siblings Palace initiates early savings through individual dedication.\n- Ages 25-34: Spouse cycle burdens capital through personal and relational expenses.\n- Ages 35-44: Ziwei cycle elevates organizational stature and executive remuneration.\n- Ages 45-54: Wealth Palace cycle activates Tianji and Jumen into lifetime financial zenith. Taiyin Hua Lu (via Ding stem decadal mutagen) activates supplementary investment success.\n- Beyond 55: Consolidates peacefully without pursuing speculative expansion.",

    "health": "Health Palace (Yin) hosts Tanlang (Neutral) + Hua Quan: robust physical vitality where disciplined moderation is a lifelong prerequisite.\n\nTanlang governs hepatic, gallbladder, and urogenital systems. Hua Quan amplifies appetites—work stamina, sensory intake, and dietary indulgence. Neutral brightness indicates medium strength that remains healthy when managed intentionally.\n\nStar-Health Correspondences:\n- Tanlang Hua Quan (Health Palace) -> Liver, gallbladder, urogenital tract. Guard against fatty liver (late nights and alcohol) and mature-age prostate sensitivities.\n- Taiyin Temple (Borrowed into Life) -> Vision and endocrine systems. Screen for eye strain.\n- Qingyang (Life Palace) -> Head and dental vulnerabilities. Tendency toward tension headaches.\n- Huoxing (Happiness Palace) -> Cardiovascular rhythms and sleep hygiene. Anxious mental loops present chronic sleep disturbance risks.\n\nDecadal Health Watchpoints:\n- Ages 55-64 (Health Palace cycle): Tanlang Hua Quan concentrates fully; a defining health milestone. Decadal Bing stem flies Lianzhen Hua Ji into Parents Palace—concurrently monitor parental health.\n- Ages 65-74 (Travel Palace cycle): Taiyang (Dim) meets Taiyin (Temple)—prioritize vision and endocrine regulation.\n\nPreventive Regimen: (1) Establish athletic routines before age 30; (2) Moderate alcohol intake to safeguard liver vitality; (3) Maintain annual comprehensive screenings after age 45; (4) Practice daily meditation to alleviate Happiness Palace Huoxing anxiety.",

    "family": "Parents Palace (Shen): Lianzhen (Temple) + Tianyue.\nParents possess formidable executive capability and decisive personalities. Lianzhen reflects drive and administrative discipline; Tianyue acts as an auxiliary benefactor star, indicating substantial maternal support. Lianzhen's clear-cut boundaries translate into strict parental expectations backed by profound underlying devotion. Ren stem flies Tianliang Hua Lu into Spouse Palace—parents provide tangible material and logistical assistance regarding marriage arrangements.\n\nSiblings Palace (Wu): Qisha (Prosperous) + Lucun.\nSiblings display fierce autonomy and resolute action—Qisha indicates independent personalities who neither lean on the native nor welcome micromanagement. Lucun indicates sibling financial competence with mutual emergency liquidity support. Qisha maintains natural boundaries: warm regard alongside mutual non-interference in life choices.\n\nChildren Palace (Chen): Ziwei (Beneficial) + Tianxiang (Beneficial) + Wenchang (Beneficial) + Lingxing (Trap).\nChildren demonstrate noble presence and natural intellectual poise—Ziwei and Tianxiang unite sovereign and executive qualities, fostering natural leadership aptitude. Wenchang supports distinguished academic achievement. Lingxing in trap state suggests quick-tempered impatience during adolescence. Ages 35-44 (passing through Children Palace) represents the ideal window for childbearing, blessing offspring with Ziwei's sovereign auspiciousness."
  },

  "daYunAnalysis": [
    {
      "ageRange": "5-14",
      "heavenlyStem": "Xin",
      "earthlyBranch": "Wei",
      "theme": "Initial decadal fortune traverses Life Palace. Empty palace with Qingyang in temple brilliance shapes early competitive drive and quick adaptability in school environments. Co-located Life and Body palaces cement foundational traits.",
      "siHuaOverlay": "Decadal Xin stem mutagens: Jumen Hua Lu (Wealth Palace), Taiyang Hua Quan (Travel Palace), Wenqu Hua Ke (Property Palace), Wenchang Hua Ji (Children Palace). Jumen Hua Lu in Wealth activates early verbal and analytical gifts. Wenchang Hua Ji in Children advises attentiveness against exam oversight.",
      "keyEvents": [
        { "age": "8-10", "event": "Family relocation or school transfer cultivates versatile environmental resilience.", "basis": "Taiyang Hua Quan in Travel Palace highlights geographic mobility." },
        { "age": "12-14", "event": "Pivotal academic transition establishing scholarly tracking.", "basis": "Concluding phase of Qingyang cycle; Wenchang Hua Ji highlights testing diligence." }
      ],
      "advice": "Cultivate expressive clarity and reading breadth—Jumen Hua Lu in Wealth marks communication as a lifelong economic asset."
    },
    {
      "ageRange": "15-24",
      "heavenlyStem": "Geng",
      "earthlyBranch": "Wu",
      "theme": "Decadal fortune traverses Siblings Palace with Qisha (Prosperous) and Lucun. Youthful awakening of self-reliance and financial independence ('I will forge my own path'). Lucun initiates initial savings via part-time employment, scholarships, or early ventures.",
      "siHuaOverlay": "Decadal Geng stem mutagens: Taiyang Hua Lu (Travel Palace), Wuqu Hua Quan (Servant Palace), Taiyin Hua Ke (Travel Palace), Tiantong Hua Ji (Career Palace). Taiyang Hua Lu and Taiyin Hua Ke unite in Travel—relocating from home proves profoundly beneficial. Tiantong Hua Ji in Career disrupts complacency with early workplace rigor.",
      "keyEvents": [
        { "age": "18", "event": "Departing home for higher education or economic self-sufficiency.", "basis": "Qisha prompts independence, Lucun begins financial footing, Taiyang Hua Lu in Travel favors relocation." },
        { "age": "22-23", "event": "First professional appointment or foundational career choice.", "basis": "Concluding phase of Lucun cycle converts into formal workplace capability." }
      ],
      "advice": "Seize relocation and educational opportunities around age 20. Tiantong Hua Ji in Career confirms early professional phases require grit to build enduring experience."
    },
    {
      "ageRange": "25-34",
      "heavenlyStem": "Ji",
      "earthlyBranch": "Si",
      "theme": "Decadal fortune traverses Spouse Palace with Tianliang (Trap) + Hua Ke + Tuoluo + Dikong + Dijie. The most turbulent decade of the chart. Romantic relationships undergo significant testing. Tianliang Hua Ke enhances public repute, while internal emotional resilience is deeply tested.",
      "siHuaOverlay": "Decadal Ji stem mutagens: Wuqu Hua Lu (Servant Palace), Tanlang Hua Quan (Health Palace), Tianliang Hua Ke (Spouse Palace), Wenqu Hua Ji (Property Palace). Wuqu Hua Lu in Servant rapidly broadens professional networks with peer support. Wenqu Hua Ji in Property cautions against rental and real estate lease disputes.",
      "keyEvents": [
        { "age": "26-28", "event": "Major relational transitions or marital crossroads amid concentrated malefic star activation.", "basis": "Spouse Palace baseline transit activates Tuoluo and Dikong/Dijie." },
        { "age": "30-32", "event": "Career breakthroughs facilitated by professional allies; diligence required on real estate contracts.", "basis": "Dual manifestation of Wuqu Hua Lu in Servant and Wenqu Hua Ji in Property." }
      ],
      "advice": "Do not force relational outcomes; view this decade as character refinement. Ensure real estate or commercial agreements receive rigorous legal review."
    },
    {
      "ageRange": "35-44",
      "heavenlyStem": "Wu",
      "earthlyBranch": "Chen",
      "theme": "Decadal fortune traverses Children Palace with Ziwei (Beneficial) + Tianxiang (Beneficial) + Wenchang (Beneficial) + Lingxing (Trap). A defining strategic turning point transitioning from defense to leadership. Sovereign star Ziwei commands the decade, elevating executive authority and industry recognition.",
      "siHuaOverlay": "Decadal Wu stem mutagens: Tanlang Hua Lu (Health Palace), Taiyin Hua Quan (Travel borrowed to Life), Youbi Hua Ke (Career Palace), Tianji Hua Ji (Wealth Palace). Youbi Hua Ke in Career brings executive sponsorship and promotions. Tianji Hua Ji in Wealth signals commercial transitions requiring prudent investment caution.",
      "keyEvents": [
        { "age": "35-37", "event": "Major executive promotion or leadership of critical enterprise initiatives.", "basis": "Ziwei and Tianxiang assemble with Youbi Hua Ke in Career." },
        { "age": "39-41", "event": "Strategic financial reallocation; minor speculative correction prompts swift structural alignment.", "basis": "Cautionary influence of Tianji Hua Ji in Wealth." }
      ],
      "advice": "A golden epoch for personal authority. Prioritize core organizational objectives and avoid speculative leverage. Ideal timing for childbearing, blessing descendants with exceptional traits."
    }
  ],

  "keyAdvice": [
    "Human Networks Are Your Greatest Asset: Wuqu Hua Lu in the Servant Palace demonstrates that collaborative syndicates and executive alliances far outperform solitary striving.",
    "Marriage Rewards Later Maturity: With dense malefic stars in the Spouse Palace, relationships before age 34 encounter turbulence; committing during the age 35+ Ziwei cycle offers superior stability.",
    "Target Senior Analytical & Advisory Roles: The Ji-Yue-Tong-Liang formation paired with Wealth Palace Tianji and Jumen excels at complex analysis and persuasive advocacy; avoid monotonous operational roles.",
    "Exercise Prudence in Real Estate: With Property Palace Pojun and Wenqu Hua Ji, real estate speculation carries heightened risk; scrutinize contractual terms diligently.",
    "Establish Spiritual Anchors: Happiness Palace Huoxing prompts internal restlessness; cultivate daily meditative and philosophical routines to anchor peace of mind."
  ],

  "luckyInfo": {
    "colors": ["White", "Yellow", "Gold"],
    "directions": ["West", "Southwest"]
  }
}
```
