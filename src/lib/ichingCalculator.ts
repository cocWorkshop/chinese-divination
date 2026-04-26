/**
 * 易經 (I Ching) deterministic calculator.
 *
 * Was previously LLM-only: the user clicked 起卦, the frontend rolled
 * `Math.random() * 64`, and the server passed a single number to the LLM
 * which had to recall everything about that hexagram from training. This
 * caused two failure modes worth fixing:
 *   1. Wrong-hexagram drift — LLM occasionally describes hexagram N with
 *      details that belong to N±1.
 *   2. 卦辭/象辭/爻辭 confusion — classical texts get cross-mixed.
 *
 * This module owns the deterministic side:
 *   - `castHexagram()` — proper 6-line cast simulating the three-coin
 *     method. Returns the original hexagram, which lines are changing,
 *     and the variant (changed) hexagram.
 *   - `lookupHexagramByLines()` / `lookupHexagramByNumber()` — given line
 *     pattern or King Wen number, return the structured hexagram with
 *     name, trigrams, canonical 卦辭 + 大象 text.
 *
 * 爻辭 (line texts) deliberately not embedded yet — that's 384 short
 * classical entries, planned for a Phase 2 once we have time to verify
 * each against 通行本. The current data covers the failure modes
 * identified above (wrong-hexagram + judgment/image confusion).
 *
 * Line values follow the classical convention: 6/7/8/9 — used inside
 * by `castHexagram`, exposed in the result so the LLM can talk about
 * 老陰/少陽/少陰/老陽 if the user asks.
 */

// ─── Trigram data ──────────────────────────────────────────────────────────

export interface Trigram {
  /** 3-bit binary, bottom-to-top: '111' = 乾, '000' = 坤 */
  binary: string
  name: string
  symbol: string
  element: string
  nature: string
}

const TRIGRAMS: Record<string, Trigram> = {
  '111': { binary: '111', name: '乾', symbol: '☰', element: '金', nature: '天' },
  '000': { binary: '000', name: '坤', symbol: '☷', element: '土', nature: '地' },
  '100': { binary: '100', name: '震', symbol: '☳', element: '木', nature: '雷' },
  '010': { binary: '010', name: '坎', symbol: '☵', element: '水', nature: '水' },
  '001': { binary: '001', name: '艮', symbol: '☶', element: '土', nature: '山' },
  '011': { binary: '011', name: '巽', symbol: '☴', element: '木', nature: '風' },
  '101': { binary: '101', name: '離', symbol: '☲', element: '火', nature: '火' },
  '110': { binary: '110', name: '兌', symbol: '☱', element: '金', nature: '澤' },
}

// ─── Hexagram data — King Wen sequence 1-64 ────────────────────────────────

export interface HexagramEntry {
  /** King Wen sequence number 1-64. */
  number: number
  /** Single-character canonical name (e.g. 乾, 坤, 屯). */
  name: string
  /** Two-character "outer-inner" form (e.g. 乾為天, 水雷屯). */
  fullName: string
  /** Top trigram binary key. */
  upper: Trigram
  /** Bottom trigram binary key. */
  lower: Trigram
  /** Bottom-to-top yin/yang per line: 1 = yang, 0 = yin. Length 6. */
  lines: number[]
  /** 卦辭 — the judgment text. Canonical 通行本 wording. */
  judgment: string
  /** 大象 — image commentary. */
  image: string
}

/**
 * 64 hexagrams in King Wen order. Each entry is hand-encoded; lines are
 * BOTTOM-TO-TOP yin(0)/yang(1). Validated against 通行本《周易》.
 */
const HEXAGRAMS: HexagramEntry[] = [
  { number: 1, name: '乾', fullName: '乾為天',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['111'],
    lines: [],
    judgment: '元亨，利貞。',
    image: '天行健，君子以自強不息。' },
  { number: 2, name: '坤', fullName: '坤為地',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['000'],
    lines: [0,0,0,0,0,0],
    judgment: '元亨。利牝馬之貞。君子有攸往，先迷後得主，利。西南得朋，東北喪朋。安貞吉。',
    image: '地勢坤，君子以厚德載物。' },
  { number: 3, name: '屯', fullName: '水雷屯',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['100'],
    lines: [1,0,0,0,1,0],
    judgment: '元亨利貞。勿用有攸往，利建侯。',
    image: '雲雷屯，君子以經綸。' },
  { number: 4, name: '蒙', fullName: '山水蒙',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['010'],
    lines: [0,1,0,0,0,1],
    judgment: '亨。匪我求童蒙，童蒙求我。初筮告，再三瀆，瀆則不告。利貞。',
    image: '山下出泉，蒙；君子以果行育德。' },
  { number: 5, name: '需', fullName: '水天需',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['111'],
    lines: [1,1,1,0,1,0],
    judgment: '有孚，光亨，貞吉。利涉大川。',
    image: '雲上於天，需；君子以飲食宴樂。' },
  { number: 6, name: '訟', fullName: '天水訟',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['010'],
    lines: [0,1,0,1,1,1],
    judgment: '有孚，窒。惕中吉。終凶。利見大人，不利涉大川。',
    image: '天與水違行，訟；君子以作事謀始。' },
  { number: 7, name: '師', fullName: '地水師',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['010'],
    lines: [0,1,0,0,0,0],
    judgment: '貞，丈人吉，無咎。',
    image: '地中有水，師；君子以容民畜眾。' },
  { number: 8, name: '比', fullName: '水地比',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['000'],
    lines: [0,0,0,0,1,0],
    judgment: '吉。原筮元永貞，無咎。不寧方來，後夫凶。',
    image: '地上有水，比；先王以建萬國，親諸侯。' },
  { number: 9, name: '小畜', fullName: '風天小畜',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['111'],
    lines: [1,1,1,1,0,1],
    judgment: '亨。密雲不雨，自我西郊。',
    image: '風行天上，小畜；君子以懿文德。' },
  { number: 10, name: '履', fullName: '天澤履',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['110'],
    lines: [1,1,0,1,1,1],
    judgment: '履虎尾，不咥人，亨。',
    image: '上天下澤，履；君子以辨上下，定民志。' },
  { number: 11, name: '泰', fullName: '地天泰',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['111'],
    lines: [1,1,1,0,0,0],
    judgment: '小往大來，吉亨。',
    image: '天地交，泰；后以財成天地之道，輔相天地之宜，以左右民。' },
  { number: 12, name: '否', fullName: '天地否',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['000'],
    lines: [0,0,0,1,1,1],
    judgment: '否之匪人，不利君子貞，大往小來。',
    image: '天地不交，否；君子以儉德辟難，不可榮以祿。' },
  { number: 13, name: '同人', fullName: '天火同人',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['101'],
    lines: [1,0,1,1,1,1],
    judgment: '同人於野，亨。利涉大川，利君子貞。',
    image: '天與火，同人；君子以類族辨物。' },
  { number: 14, name: '大有', fullName: '火天大有',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['111'],
    lines: [1,1,1,1,0,1],
    judgment: '元亨。',
    image: '火在天上，大有；君子以遏惡揚善，順天休命。' },
  { number: 15, name: '謙', fullName: '地山謙',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['001'],
    lines: [0,0,1,0,0,0],
    judgment: '亨。君子有終。',
    image: '地中有山，謙；君子以裒多益寡，稱物平施。' },
  { number: 16, name: '豫', fullName: '雷地豫',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['000'],
    lines: [0,0,0,1,0,0],
    judgment: '利建侯行師。',
    image: '雷出地奮，豫；先王以作樂崇德，殷薦之上帝，以配祖考。' },
  { number: 17, name: '隨', fullName: '澤雷隨',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['100'],
    lines: [1,0,0,1,1,0],
    judgment: '元亨利貞，無咎。',
    image: '澤中有雷，隨；君子以嚮晦入宴息。' },
  { number: 18, name: '蠱', fullName: '山風蠱',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['011'],
    lines: [1,1,0,0,0,1],
    judgment: '元亨，利涉大川。先甲三日，後甲三日。',
    image: '山下有風，蠱；君子以振民育德。' },
  { number: 19, name: '臨', fullName: '地澤臨',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['110'],
    lines: [1,1,0,0,0,0],
    judgment: '元亨利貞。至於八月有凶。',
    image: '澤上有地，臨；君子以教思無窮，容保民無疆。' },
  { number: 20, name: '觀', fullName: '風地觀',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['000'],
    lines: [0,0,0,0,1,1],
    judgment: '盥而不薦，有孚顒若。',
    image: '風行地上，觀；先王以省方觀民設教。' },
  { number: 21, name: '噬嗑', fullName: '火雷噬嗑',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['100'],
    lines: [1,0,0,1,0,1],
    judgment: '亨。利用獄。',
    image: '雷電噬嗑；先王以明罰敕法。' },
  { number: 22, name: '賁', fullName: '山火賁',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['101'],
    lines: [1,0,1,0,0,1],
    judgment: '亨。小利有攸往。',
    image: '山下有火，賁；君子以明庶政，無敢折獄。' },
  { number: 23, name: '剝', fullName: '山地剝',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['000'],
    lines: [0,0,0,0,0,1],
    judgment: '不利有攸往。',
    image: '山附於地，剝；上以厚下安宅。' },
  { number: 24, name: '復', fullName: '地雷復',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['100'],
    lines: [1,0,0,0,0,0],
    judgment: '亨。出入無疾，朋來無咎。反復其道，七日來復，利有攸往。',
    image: '雷在地中，復；先王以至日閉關，商旅不行，后不省方。' },
  { number: 25, name: '無妄', fullName: '天雷無妄',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['100'],
    lines: [1,0,0,1,1,1],
    judgment: '元亨利貞。其匪正有眚，不利有攸往。',
    image: '天下雷行，物與無妄；先王以茂對時，育萬物。' },
  { number: 26, name: '大畜', fullName: '山天大畜',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['111'],
    lines: [1,1,1,0,0,1],
    judgment: '利貞。不家食吉，利涉大川。',
    image: '天在山中，大畜；君子以多識前言往行，以畜其德。' },
  { number: 27, name: '頤', fullName: '山雷頤',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['100'],
    lines: [1,0,0,0,0,1],
    judgment: '貞吉。觀頤，自求口實。',
    image: '山下有雷，頤；君子以慎言語，節飲食。' },
  { number: 28, name: '大過', fullName: '澤風大過',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['011'],
    lines: [0,1,1,1,1,0],
    judgment: '棟橈，利有攸往，亨。',
    image: '澤滅木，大過；君子以獨立不懼，遯世無悶。' },
  { number: 29, name: '坎', fullName: '坎為水',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['010'],
    lines: [0,1,0,0,1,0],
    judgment: '習坎，有孚，維心亨，行有尚。',
    image: '水洊至，習坎；君子以常德行，習教事。' },
  { number: 30, name: '離', fullName: '離為火',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['101'],
    lines: [1,0,1,1,0,1],
    judgment: '利貞，亨。畜牝牛吉。',
    image: '明兩作，離；大人以繼明照於四方。' },
  { number: 31, name: '咸', fullName: '澤山咸',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['001'],
    lines: [0,0,1,1,1,0],
    judgment: '亨利貞。取女吉。',
    image: '山上有澤，咸；君子以虛受人。' },
  { number: 32, name: '恆', fullName: '雷風恆',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['011'],
    lines: [1,1,0,1,0,0],
    judgment: '亨，無咎，利貞。利有攸往。',
    image: '雷風，恆；君子以立不易方。' },
  { number: 33, name: '遯', fullName: '天山遯',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['001'],
    lines: [0,0,1,1,1,1],
    judgment: '亨，小利貞。',
    image: '天下有山，遯；君子以遠小人，不惡而嚴。' },
  { number: 34, name: '大壯', fullName: '雷天大壯',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['111'],
    lines: [1,1,1,1,0,0],
    judgment: '利貞。',
    image: '雷在天上，大壯；君子以非禮弗履。' },
  { number: 35, name: '晉', fullName: '火地晉',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['000'],
    lines: [0,0,0,1,0,1],
    judgment: '康侯用錫馬蕃庶，晝日三接。',
    image: '明出地上，晉；君子以自昭明德。' },
  { number: 36, name: '明夷', fullName: '地火明夷',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['101'],
    lines: [1,0,1,0,0,0],
    judgment: '利艱貞。',
    image: '明入地中，明夷；君子以蒞眾，用晦而明。' },
  { number: 37, name: '家人', fullName: '風火家人',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['101'],
    lines: [1,0,1,1,0,1],
    judgment: '利女貞。',
    image: '風自火出，家人；君子以言有物，而行有恆。' },
  { number: 38, name: '睽', fullName: '火澤睽',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['110'],
    lines: [1,1,0,1,0,1],
    judgment: '小事吉。',
    image: '上火下澤，睽；君子以同而異。' },
  { number: 39, name: '蹇', fullName: '水山蹇',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['001'],
    lines: [0,0,1,0,1,0],
    judgment: '利西南，不利東北。利見大人，貞吉。',
    image: '山上有水，蹇；君子以反身修德。' },
  { number: 40, name: '解', fullName: '雷水解',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['010'],
    lines: [0,1,0,1,0,0],
    judgment: '利西南。無所往，其來復吉。有攸往，夙吉。',
    image: '雷雨作，解；君子以赦過宥罪。' },
  { number: 41, name: '損', fullName: '山澤損',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['110'],
    lines: [1,1,0,0,0,1],
    judgment: '有孚，元吉，無咎，可貞，利有攸往。曷之用？二簋可用享。',
    image: '山下有澤，損；君子以懲忿窒欲。' },
  { number: 42, name: '益', fullName: '風雷益',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['100'],
    lines: [1,0,0,0,1,1],
    judgment: '利有攸往，利涉大川。',
    image: '風雷，益；君子以見善則遷，有過則改。' },
  { number: 43, name: '夬', fullName: '澤天夬',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['111'],
    lines: [1,1,1,1,1,0],
    judgment: '揚於王庭，孚號有厲。告自邑，不利即戎，利有攸往。',
    image: '澤上於天，夬；君子以施祿及下，居德則忌。' },
  { number: 44, name: '姤', fullName: '天風姤',
    upper: TRIGRAMS['111'], lower: TRIGRAMS['011'],
    lines: [0,1,1,1,1,1],
    judgment: '女壯，勿用取女。',
    image: '天下有風，姤；后以施命誥四方。' },
  { number: 45, name: '萃', fullName: '澤地萃',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['000'],
    lines: [0,0,0,1,1,0],
    judgment: '亨。王假有廟，利見大人，亨，利貞。用大牲吉，利有攸往。',
    image: '澤上於地，萃；君子以除戎器，戒不虞。' },
  { number: 46, name: '升', fullName: '地風升',
    upper: TRIGRAMS['000'], lower: TRIGRAMS['011'],
    lines: [1,1,0,0,0,0],
    judgment: '元亨，用見大人，勿恤，南征吉。',
    image: '地中生木，升；君子以順德，積小以高大。' },
  { number: 47, name: '困', fullName: '澤水困',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['010'],
    lines: [0,1,0,1,1,0],
    judgment: '亨，貞，大人吉，無咎。有言不信。',
    image: '澤無水，困；君子以致命遂志。' },
  { number: 48, name: '井', fullName: '水風井',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['011'],
    lines: [1,1,0,0,1,0],
    judgment: '改邑不改井，無喪無得。往來井井。汔至亦未繘井，羸其瓶，凶。',
    image: '木上有水，井；君子以勞民勸相。' },
  { number: 49, name: '革', fullName: '澤火革',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['101'],
    lines: [1,0,1,1,1,0],
    judgment: '巳日乃孚，元亨利貞，悔亡。',
    image: '澤中有火，革；君子以治曆明時。' },
  { number: 50, name: '鼎', fullName: '火風鼎',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['011'],
    lines: [1,1,0,1,0,1],
    judgment: '元吉，亨。',
    image: '木上有火，鼎；君子以正位凝命。' },
  { number: 51, name: '震', fullName: '震為雷',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['100'],
    lines: [1,0,0,1,0,0],
    judgment: '亨。震來虩虩，笑言啞啞。震驚百里，不喪匕鬯。',
    image: '洊雷，震；君子以恐懼修省。' },
  { number: 52, name: '艮', fullName: '艮為山',
    upper: TRIGRAMS['001'], lower: TRIGRAMS['001'],
    lines: [0,0,1,0,0,1],
    judgment: '艮其背，不獲其身，行其庭，不見其人，無咎。',
    image: '兼山，艮；君子以思不出其位。' },
  { number: 53, name: '漸', fullName: '風山漸',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['001'],
    lines: [0,0,1,0,1,1],
    judgment: '女歸吉，利貞。',
    image: '山上有木，漸；君子以居賢德善俗。' },
  { number: 54, name: '歸妹', fullName: '雷澤歸妹',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['110'],
    lines: [1,1,0,1,0,0],
    judgment: '征凶，無攸利。',
    image: '澤上有雷，歸妹；君子以永終知敝。' },
  { number: 55, name: '豐', fullName: '雷火豐',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['101'],
    lines: [1,0,1,1,0,0],
    judgment: '亨，王假之，勿憂，宜日中。',
    image: '雷電皆至，豐；君子以折獄致刑。' },
  { number: 56, name: '旅', fullName: '火山旅',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['001'],
    lines: [0,0,1,1,0,1],
    judgment: '小亨，旅貞吉。',
    image: '山上有火，旅；君子以明慎用刑，而不留獄。' },
  { number: 57, name: '巽', fullName: '巽為風',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['011'],
    lines: [1,1,0,1,1,0],
    judgment: '小亨，利有攸往，利見大人。',
    image: '隨風，巽；君子以申命行事。' },
  { number: 58, name: '兌', fullName: '兌為澤',
    upper: TRIGRAMS['110'], lower: TRIGRAMS['110'],
    lines: [1,1,0,1,1,0],
    judgment: '亨，利貞。',
    image: '麗澤，兌；君子以朋友講習。' },
  { number: 59, name: '渙', fullName: '風水渙',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['010'],
    lines: [0,1,0,1,1,0],
    judgment: '亨。王假有廟，利涉大川，利貞。',
    image: '風行水上，渙；先王以享于帝立廟。' },
  { number: 60, name: '節', fullName: '水澤節',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['110'],
    lines: [1,1,0,0,1,0],
    judgment: '亨。苦節不可貞。',
    image: '澤上有水，節；君子以制數度，議德行。' },
  { number: 61, name: '中孚', fullName: '風澤中孚',
    upper: TRIGRAMS['011'], lower: TRIGRAMS['110'],
    lines: [1,1,0,0,1,1],
    judgment: '豚魚吉，利涉大川，利貞。',
    image: '澤上有風，中孚；君子以議獄緩死。' },
  { number: 62, name: '小過', fullName: '雷山小過',
    upper: TRIGRAMS['100'], lower: TRIGRAMS['001'],
    lines: [0,0,1,1,0,0],
    judgment: '亨，利貞。可小事，不可大事。飛鳥遺之音，不宜上宜下，大吉。',
    image: '山上有雷，小過；君子以行過乎恭，喪過乎哀，用過乎儉。' },
  { number: 63, name: '既濟', fullName: '水火既濟',
    upper: TRIGRAMS['010'], lower: TRIGRAMS['101'],
    lines: [1,0,1,0,1,0],
    judgment: '亨，小利貞。初吉終亂。',
    image: '水在火上，既濟；君子以思患而豫防之。' },
  { number: 64, name: '未濟', fullName: '火水未濟',
    upper: TRIGRAMS['101'], lower: TRIGRAMS['010'],
    lines: [0,1,0,1,0,1],
    judgment: '亨。小狐汔濟，濡其尾，無攸利。',
    image: '火在水上，未濟；君子以慎辨物居方。' },
]

// Auto-derive each hexagram's `lines` array from its trigram binary keys at
// module load. Trigram keys are bottom-to-top, and so is the line array, so
// we just concatenate `lower.binary` + `upper.binary`. This overrides any
// hand-entered `lines` value above, eliminating 64 chances for human error.
for (const h of HEXAGRAMS) {
  h.lines = (h.lower.binary + h.upper.binary).split('').map(Number)
}

// ─── Lookup helpers ────────────────────────────────────────────────────────

/** Convert a 6-line array (bottom-to-top yin/yang) to its King Wen entry. */
export function lookupHexagramByLines(lines: number[]): HexagramEntry {
  if (lines.length !== 6) throw new Error(`Expected 6 lines, got ${lines.length}`)
  // Lines come bottom-to-top; lower trigram = lines[0..2], upper = lines[3..5].
  // Each trigram's binary string is bottom-to-top too: line[0] is the rightmost
  // (bottom) bit of the trigram's 3-char representation when read top-to-bottom.
  // We use the same bottom-to-top encoding as TRIGRAMS for direct lookup.
  // BUT trigram keys read bottom-to-top: '111' = all yang; for 震 ('100')
  // bottom is 1, middle 0, top 0 — match by reading lines bottom-to-top
  // and concatenating bottom-first.
  const lowerKey = `${lines[0]}${lines[1]}${lines[2]}`
  const upperKey = `${lines[3]}${lines[4]}${lines[5]}`
  // Convert to the trigram-name keying our TRIGRAMS uses. Our TRIGRAMS
  // keys are already encoded that way: for 震 (☳), bottom yang line means
  // the bottom bit is 1 → key is '100' (bottom=1, middle=0, top=0).
  const lower = TRIGRAMS[lowerKey]
  const upper = TRIGRAMS[upperKey]
  if (!lower || !upper) throw new Error(`Unknown trigram: ${lowerKey}/${upperKey}`)
  // Find hexagram whose stored upper.binary + lower.binary matches.
  const found = HEXAGRAMS.find(
    (h) => h.upper.binary === upper.binary && h.lower.binary === lower.binary,
  )
  if (!found) throw new Error(`No hexagram for upper=${upper.name} lower=${lower.name}`)
  return found
}

/** Look up by King Wen number 1-64. */
export function lookupHexagramByNumber(n: number): HexagramEntry {
  const found = HEXAGRAMS.find((h) => h.number === n)
  if (!found) throw new Error(`Invalid hexagram number: ${n}`)
  return found
}

// ─── Casting ───────────────────────────────────────────────────────────────

/**
 * Result of a single 6-line cast. `lineValues` are the raw 6/7/8/9 values
 * (老陰/少陽/少陰/老陽 respectively); `original` is the cast hexagram;
 * `changingLines` lists positions (1-6, bottom-to-top) where 老陰 or 老陽
 * appeared; `variant` is the hexagram you get by flipping those lines.
 * `variant` is undefined when no lines are changing.
 */
export interface CastResult {
  /** Bottom-to-top, 6 entries each ∈ {6,7,8,9}. */
  lineValues: number[]
  original: HexagramEntry
  /** Position numbers (1-6, bottom-to-top) of the changing lines. */
  changingLines: number[]
  /** Variant hexagram (changing lines flipped). Undefined if no changes. */
  variant?: HexagramEntry
}

/** Simulate one toss of three coins → sum of "heads(2) / tails(3)". */
function tossThreeCoins(): number {
  let sum = 0
  for (let i = 0; i < 3; i++) sum += Math.random() < 0.5 ? 2 : 3
  return sum // 6, 7, 8, or 9
}

/**
 * Cast a full 6-line hexagram by tossing three coins six times. Returns
 * original hexagram + changing lines + variant. This is the proper
 * 三枚銅錢法 — older versions of this app just did `random() * 64`,
 * which loses changing-line / variant information.
 */
export function castHexagram(): CastResult {
  const lineValues: number[] = []
  for (let i = 0; i < 6; i++) lineValues.push(tossThreeCoins())
  return interpretCast(lineValues)
}

/**
 * Same shape as `castHexagram` but for an already-rolled set of line
 * values (e.g. when the frontend tosses client-side and submits to the
 * backend). Validates each value ∈ {6,7,8,9}.
 */
export function interpretCast(lineValues: number[]): CastResult {
  if (lineValues.length !== 6) throw new Error(`Expected 6 line values, got ${lineValues.length}`)
  for (const v of lineValues) {
    if (v < 6 || v > 9) throw new Error(`Line value out of range: ${v}`)
  }
  // Original lines: 6/8 → yin (0); 7/9 → yang (1).
  const originalLines = lineValues.map((v) => (v === 7 || v === 9 ? 1 : 0))
  const original = lookupHexagramByLines(originalLines)
  // Changing positions: 6 (老陰) or 9 (老陽).
  const changingLines: number[] = []
  for (let i = 0; i < 6; i++) {
    if (lineValues[i] === 6 || lineValues[i] === 9) changingLines.push(i + 1)
  }
  // Variant: flip changing lines.
  let variant: HexagramEntry | undefined
  if (changingLines.length > 0) {
    const variantLines = lineValues.map((v, i) => {
      if (v === 6) return 1 // 老陰 → 陽
      if (v === 9) return 0 // 老陽 → 陰
      return originalLines[i]
    })
    variant = lookupHexagramByLines(variantLines)
  }
  return { lineValues, original, changingLines, variant }
}

/**
 * Backward-compat helper: when the legacy frontend just sends a 1-64
 * hexagram number with no line values, look up the hexagram and return
 * a synthetic CastResult with no changing lines. The LLM gets less
 * context than a real 6-line cast but still benefits from the canonical
 * 卦辭 / 大象 lookup.
 */
export function castFromNumber(n: number): CastResult {
  const original = lookupHexagramByNumber(n)
  return {
    lineValues: original.lines.map((v) => (v === 1 ? 7 : 8)), // all 少陽/少陰, no changes
    original,
    changingLines: [],
  }
}
