// Educational content playlists for each divination type
// Each type has multiple groups of sequential sentences
// Format: { zh: Traditional Chinese, en: English }

export interface TipSentence {
  zh: string
  en: string
}

export type TipPlaylist = TipSentence[]

export const divinationTips: Record<string, TipPlaylist[]> = {
  bazi: [
    [
      { zh: '八字命理源於古代天文曆法，以出生年、月、日、時的天干地支組成「四柱」', en: 'BaZi (Four Pillars) originates from ancient Chinese astronomy, using Heavenly Stems and Earthly Branches of birth year, month, day, and hour.' },
      { zh: '天干有十：甲乙丙丁戊己庚辛壬癸，象徵天之氣', en: 'The 10 Heavenly Stems — Jiǎ, Yǐ, Bǐng, Dīng, Wù, Jǐ, Gēng, Xīn, Rén, Guǐ — represent celestial energy.' },
      { zh: '地支有十二：子丑寅卯辰巳午未申酉戌亥，對應十二生肖', en: 'The 12 Earthly Branches correspond to the 12 Chinese zodiac animals, from Rat (Zǐ) to Pig (Hài).' },
      { zh: '八字分析的核心是「日主」——出生日的天干，代表命主自身', en: 'The Day Master (日主) — the Heavenly Stem of the birth day — represents the self and is the core of BaZi analysis.' },
      { zh: '五行生剋是八字推演的基礎：木生火、火生土、土生金、金生水、水生木', en: 'The Five Elements cycle — Wood feeds Fire, Fire creates Earth, Earth bears Metal, Metal collects Water, Water nourishes Wood.' },
    ],
    [
      { zh: '八字中的「十神」體系描述了日主與其他干支的關係', en: 'The "Ten Gods" system describes relationships between the Day Master and other stems/branches.' },
      { zh: '「正官」代表秩序與責任，「偏官（七殺）」則象徵壓力與挑戰', en: 'Direct Officer represents order and duty; Seven Killings symbolizes pressure and challenge.' },
      { zh: '「食神」主才華與享受，「傷官」則代表叛逆與創造力', en: 'Eating God governs talent and enjoyment; Hurting Officer represents rebellion and creativity.' },
      { zh: '唐代李虛中首創以年柱論命，宋代徐子平改以日柱為主，奠定現代八字學基礎', en: 'Li Xūzhōng (Tang dynasty) pioneered year-pillar analysis; Xú Zǐpíng (Song dynasty) shifted focus to the day pillar, founding modern BaZi.' },
      { zh: '大運每十年一變，流年逐年更替，二者交互影響命主的運勢起伏', en: 'Luck Pillars change every 10 years, while Annual Pillars shift yearly — together they shape life\'s ups and downs.' },
    ],
    [
      { zh: '八字講究「身強身弱」——日主得令、得地、得生、得助則為身強', en: 'BaZi distinguishes "strong" vs "weak" Day Masters based on seasonal timing, root support, and elemental assistance.' },
      { zh: '「用神」是八字中最關鍵的概念，指平衡命局所需的五行', en: 'The "Useful God" (用神) is the most critical concept — the element needed to balance the chart.' },
      { zh: '命理學認為，格局決定人生高度，而大運決定何時實現', en: 'In BaZi theory, the chart pattern determines life potential, while Luck Pillars determine when it manifests.' },
      { zh: '《滴天髓》與《子平真詮》是八字命理最重要的兩部經典', en: 'Dī Tiān Suǐ and Zǐ Píng Zhēn Quán are the two most important classical texts of BaZi.' },
    ],
    [
      { zh: '八字中的「空亡」指六十甲子中未配對的兩個地支，代表虛無或延遲', en: 'Void (空亡) refers to two unmatched Earthly Branches in the 60 Jiazi cycle, symbolizing emptiness or delay.' },
      { zh: '「桃花」（子午卯酉）在八字中代表人緣、魅力與感情機遇', en: 'Peach Blossom stars (Zǐ, Wǔ, Mǎo, Yǒu) represent charisma, relationships, and romantic opportunities.' },
      { zh: '「驛馬」星動代表遷移與變動，古人以此判斷是否適合遠行或搬遷', en: 'The Travelling Horse star indicates movement and change — ancients used it to judge travel and relocation.' },
      { zh: '命理師常說「命好不如運好」，強調時運對人生的重要性', en: 'As practitioners say: "A good fate is not as good as good timing" — emphasizing the power of luck cycles.' },
      { zh: '現代八字學融合心理學觀點，將性格分析與命運預測結合', en: 'Modern BaZi integrates psychological perspectives, combining personality analysis with destiny prediction.' },
    ],
  ],

  ziwei: [
    [
      { zh: '紫微斗數被譽為「天下第一神數」，相傳由宋代陳摶（陳希夷）所創', en: 'Zi Wei Dou Shu, called "the supreme divination art," is attributed to Chén Tuán of the Song dynasty.' },
      { zh: '紫微命盤由十二宮位組成，象徵人生的不同面向', en: 'A Zi Wei chart consists of 12 palaces, each representing a different aspect of life.' },
      { zh: '命宮是命盤的核心，反映命主的性格與人生格局', en: 'The Life Palace (命宮) is the chart\'s core, reflecting personality and life pattern.' },
      { zh: '紫微星是帝王之星，入命者通常具有領導氣質與高遠志向', en: 'The Purple Star (紫微) is the Emperor Star — those who have it in their Life Palace often show leadership qualities.' },
      { zh: '斗數共有十四顆主星，分為北斗與南斗兩大系統', en: 'There are 14 major stars in Zi Wei Dou Shu, divided into Northern Dipper and Southern Dipper systems.' },
    ],
    [
      { zh: '紫微斗數的十二宮包括：命宮、兄弟、夫妻、子女、財帛、疾厄等', en: 'The 12 palaces include: Life, Siblings, Spouse, Children, Wealth, Health, Travel, Friends, Career, Property, Fortune, and Parents.' },
      { zh: '「四化」是紫微斗數最精妙的技法：化祿、化權、化科、化忌', en: 'The "Four Transformations" are Zi Wei\'s most refined technique: Hua Lu (wealth), Hua Quan (power), Hua Ke (fame), Hua Ji (obstruction).' },
      { zh: '每個大限（十年運）會改變宮位的星曜組合，帶來不同人生主題', en: 'Each major period (10-year cycle) reshuffles the star combinations in palaces, bringing different life themes.' },
      { zh: '天府星與紫微星分別統領南北斗星系，二者永遠在命盤中對望', en: 'Tian Fu and Zi Wei lead the Southern and Northern star systems respectively, always facing each other across the chart.' },
    ],
    [
      { zh: '紫微斗數特別重視「三方四正」——命宮及其對宮、三合宮的星曜影響', en: 'Zi Wei emphasizes the "Three Directions, Four Alignments" — stars in the opposite and trine palaces all influence the Life Palace.' },
      { zh: '「殺破狼」三星（七殺、破軍、貪狼）組合代表變動與開創', en: 'The "Sha Po Lang" trio (Seven Killings, Army Breaker, Greedy Wolf) represents transformation and pioneering.' },
      { zh: '「機月同梁」格局（天機、太陰、天同、天梁）適合從事文職或專業工作', en: 'The "Ji Yue Tong Liang" pattern is suited for professional, academic, or civil service careers.' },
      { zh: '紫微斗數最大的優勢是能精確到十年大運與流年的具體事件預測', en: 'Zi Wei\'s greatest strength is its ability to predict specific events within 10-year and annual cycles.' },
      { zh: '現代紫微斗數流派眾多，以「三合派」與「飛星派」最為主流', en: 'Modern Zi Wei has many schools — the "Three Harmony" and "Flying Star" methods are most mainstream.' },
    ],
    [
      { zh: '紫微斗數中的「輔星」如左輔、右弼能增強主星的力量', en: 'Auxiliary stars like Left Assistant and Right Deputy strengthen the main stars\' influence.' },
      { zh: '「煞星」如擎羊、陀羅、火星、鈴星帶來挑戰，但也可能激發潛能', en: 'Malefic stars like Qing Yang and Tuo Luo bring challenges, but can also catalyze hidden potential.' },
      { zh: '命盤中的「空宮」並非不好，借對宮星曜之力反而可能帶來靈活變通', en: 'An empty palace isn\'t necessarily bad — borrowing from the opposite palace can bring flexibility and adaptability.' },
      { zh: '紫微斗數原為皇室專用，民間流傳後逐漸成為最受歡迎的命理術之一', en: 'Originally reserved for royalty, Zi Wei Dou Shu became one of the most popular divination arts after spreading to the public.' },
    ],
  ],

  liuyao: [
    [
      { zh: '六爻占卜源於《周易》，是最古老的實用占卜術之一', en: 'Liu Yao divination originates from the Zhou Yi (Book of Changes), one of the oldest practical oracle methods.' },
      { zh: '六爻以三枚銅錢搖卦，每次得出一爻，共搖六次組成一個卦象', en: 'Three coins are tossed six times — each toss produces one line, together forming a complete hexagram.' },
      { zh: '卦中的「動爻」（老陰老陽）會變化，產生「變卦」，是解卦的關鍵', en: 'Changing lines (Old Yin = 6, Old Yang = 9) transform to create the "changed hexagram" — key to interpretation.' },
      { zh: '六爻分析的核心是「六親」：父母、兄弟、子孫、妻財、官鬼', en: 'The core of Liu Yao analysis is the "Six Relations": Parents, Siblings, Offspring, Wealth, and Authority.' },
      { zh: '「世爻」代表問卦人自己，「應爻」代表對方或事物的另一面', en: 'The "World Line" represents the querent; the "Response Line" represents the other party or situation.' },
    ],
    [
      { zh: '六爻占卜講究「一事一占」，心中誠念所問之事，心越專注卦越準', en: 'Liu Yao requires "one question per cast" — the more focused your mind, the more accurate the reading.' },
      { zh: '京房（西漢）將五行納入卦爻體系，奠定了六爻預測學的理論基礎', en: 'Jīng Fáng (Western Han) integrated the Five Elements into hexagram theory, founding Liu Yao\'s theoretical basis.' },
      { zh: '六爻中的「用神」是與所問事項最直接相關的六親，找對用神是解卦第一步', en: 'The "Subject Spirit" is the Six Relation most relevant to the question — identifying it correctly is step one.' },
      { zh: '「月建」和「日辰」是判斷爻之旺衰的兩大標準，如同八字中的月令', en: 'The Monthly and Daily stems/branches determine each line\'s strength — similar to the Month Commander in BaZi.' },
    ],
    [
      { zh: '六爻中的「六獸」——青龍、朱雀、勾陳、螣蛇、白虎、玄武——輔助判斷事態性質', en: 'The "Six Animals" — Azure Dragon, Vermillion Bird, Hook Snake, Soaring Serpent, White Tiger, Dark Warrior — help judge the nature of events.' },
      { zh: '「伏神」是卦中未出現但影響深遠的六親，如同隱藏的力量', en: 'Hidden Spirits (伏神) are Six Relations absent from the hexagram but still influential — like hidden forces.' },
      { zh: '「反吟」與「伏吟」是六爻中的特殊格局，分別代表反覆與憂慮', en: 'Counter-chant and Hidden-chant are special patterns — representing reversal/repetition and worry/stagnation respectively.' },
      { zh: '古人認為搖卦時的心念與宇宙能量共振，這與量子力學的觀察者效應異曲同工', en: 'Ancients believed the querent\'s intention resonates with cosmic energy — echoing quantum mechanics\' observer effect.' },
      { zh: '六爻在預測具體事件的時間和結果方面，被認為是所有占卜術中最精準的', en: 'Liu Yao is considered the most precise of all divination methods for predicting specific event timing and outcomes.' },
    ],
    [
      { zh: '六爻占卜的歷史可追溯至三千多年前的殷商時期，當時以蓍草起卦', en: 'Liu Yao\'s history traces back over 3,000 years to the Shang dynasty, when yarrow stalks were used instead of coins.' },
      { zh: '「生剋沖合」是六爻斷卦的基本法則——生扶為吉，剋制為凶，沖動為變', en: 'Generation, control, clash, and combination are the basic rules — support is auspicious, control is adverse, clash means change.' },
      { zh: '卦象的六個爻位從下到上，分別對應初、二、三、四、五、上，象徵由低到高', en: 'The six line positions run bottom to top (1st through 6th), symbolizing progression from low to high.' },
      { zh: '「空亡」之爻暫時失去作用，但出空時效力加倍，常代表事情有所延遲', en: 'Voided lines temporarily lose power, but double in effect when emerging from void — often indicating delays.' },
    ],
  ],

  qimen: [
    [
      { zh: '奇門遁甲被稱為「帝王之學」，傳說由九天玄女傳授黃帝用於戰爭', en: 'Qi Men Dun Jia, called "the Emperor\'s Art," was legendarily taught by the Mysterious Lady of Nine Heavens to the Yellow Emperor for warfare.' },
      { zh: '「奇」指天干中的乙丙丁三奇，「門」指八門，「遁甲」指甲木隱藏', en: '"Qi" refers to the three special stems (Yi, Bing, Ding); "Men" means eight gates; "Dun Jia" means the hidden Jia stem.' },
      { zh: '奇門遁甲共有1080局，分為陽遁540局與陰遁540局', en: 'Qi Men has 1,080 formations total — 540 Yang-hidden and 540 Yin-hidden configurations.' },
      { zh: '諸葛亮與劉伯溫均精通奇門遁甲，用於軍事謀略與國家決策', en: 'Both Zhuge Liang and Liu Bowen mastered Qi Men Dun Jia, applying it to military strategy and statecraft.' },
    ],
    [
      { zh: '奇門遁甲的九宮格對應洛書數字，是古代數學與玄學的完美結合', en: 'The 9-palace grid corresponds to the Luo Shu magic square — a perfect fusion of ancient mathematics and metaphysics.' },
      { zh: '八門（開、休、生、傷、杜、景、死、驚）代表事物發展的八種狀態', en: 'The Eight Gates (Open, Rest, Life, Harm, Block, View, Death, Shock) represent eight states of development.' },
      { zh: '九星（天蓬至天英）代表天時的影響，與八門地利相互配合', en: 'The Nine Stars represent celestial timing, working in concert with the Eight Gates\' terrestrial influence.' },
      { zh: '奇門遁甲最大的特點是「時空合一」，同時考慮時間與方位的吉凶', en: 'Qi Men\'s greatest feature is "unity of time and space" — simultaneously assessing fortune through timing and direction.' },
    ],
  ],

  meihua: [
    [
      { zh: '梅花易數由宋代邵雍（邵康節）所創，以「先天易學」為理論基礎', en: 'Plum Blossom Numerology was created by Shào Yōng (Song dynasty), based on "Pre-Heaven Yi Studies."' },
      { zh: '邵雍觀梅花而悟卦，由此得名「梅花易數」', en: 'Shào Yōng was inspired by observing plum blossoms — hence the name "Plum Blossom Numerology."' },
      { zh: '梅花易數的精髓是「隨機取象」——任何數字、事物、現象都可起卦', en: 'Its essence is "taking symbols from randomness" — any number, object, or phenomenon can generate a hexagram.' },
      { zh: '「體卦」代表自己，「用卦」代表對方或所問之事，體用生剋定吉凶', en: 'The "Body Trigram" represents self, the "Function Trigram" represents the situation — their interaction determines fortune.' },
    ],
    [
      { zh: '梅花易數可以用時間起卦、數字起卦、文字起卦，甚至聲音起卦', en: 'Plum Blossom can cast hexagrams from time, numbers, written characters, or even sounds.' },
      { zh: '邵雍在《皇極經世》中提出了宇宙週期理論，影響深遠', en: 'Shào Yōng\'s "Supreme Principles Governing the World" proposed a cosmic cycle theory with far-reaching influence.' },
      { zh: '梅花易數重「心易」——占者的直覺與靈感是解卦的最高境界', en: 'Plum Blossom emphasizes "Heart Yi" — the diviner\'s intuition and inspiration are the highest level of interpretation.' },
    ],
  ],

  iching: [
    [
      { zh: '《易經》是中華文化最古老的經典之一，被列為群經之首', en: 'The I Ching (Book of Changes) is one of the oldest Chinese classics, honored as the foremost of all scriptures.' },
      { zh: '六十四卦由八個基本卦（八卦）兩兩組合而成，象徵萬事萬物的變化', en: 'The 64 hexagrams are formed by combining the 8 basic trigrams in pairs, symbolizing all changes in the universe.' },
      { zh: '伏羲畫八卦、文王演六十四卦、周公作爻辭、孔子寫十翼——四聖成易', en: 'Fu Xi drew the 8 trigrams, King Wen derived the 64 hexagrams, Duke of Zhou wrote line texts, Confucius penned the Ten Wings — Four Sages completed the Yi.' },
      { zh: '《易經》的核心哲學是「變化」——唯一不變的就是變化本身', en: 'The I Ching\'s core philosophy is "change" — the only constant is change itself.' },
      { zh: '萊布尼茲發現易經的陰陽爻與二進制數學相通，認為東方古人已觸及計算機原理', en: 'Leibniz discovered that Yin-Yang lines correspond to binary mathematics, believing the ancients had touched upon computing principles.' },
    ],
    [
      { zh: '八卦分別是：乾（天）、坤（地）、震（雷）、巽（風）、坎（水）、離（火）、艮（山）、兌（澤）', en: 'The 8 trigrams: Qian (Heaven), Kun (Earth), Zhen (Thunder), Xun (Wind), Kan (Water), Li (Fire), Gen (Mountain), Dui (Lake).' },
      { zh: '「太極生兩儀，兩儀生四象，四象生八卦」描述了宇宙從無到有的演化', en: '"Taiji generates Two Modes, Two Modes generate Four Images, Four Images generate Eight Trigrams" — the universe\'s evolution from void to form.' },
      { zh: '榮格（Carl Jung）深受《易經》啟發，提出了「共時性」理論', en: 'Carl Jung was deeply inspired by the I Ching, leading to his theory of "synchronicity."' },
      { zh: '《易經》不僅是占卜之書，更是哲學、倫理、政治智慧的寶庫', en: 'The I Ching is not merely a divination manual — it\'s a treasury of philosophy, ethics, and political wisdom.' },
    ],
  ],

  fengshui: [
    [
      { zh: '風水學的核心概念是「氣」——生氣流動之處即為吉地', en: 'Feng Shui\'s core concept is "Qi" — where vital energy flows smoothly is considered auspicious land.' },
      { zh: '「風水」一詞出自郭璞《葬書》：「氣乘風則散，界水則止」', en: 'The term "Feng Shui" comes from Guo Pu\'s "Burial Classic": "Qi disperses with wind and stops at water boundaries."' },
      { zh: '風水分為「巒頭」（地形地貌）與「理氣」（方位能量）兩大派別', en: 'Feng Shui divides into two schools: "Forms" (landform analysis) and "Compass" (directional energy).' },
      { zh: '理想的風水格局是「前朱雀、後玄武、左青龍、右白虎」', en: 'The ideal Feng Shui layout: Vermillion Bird (front), Dark Warrior (back), Azure Dragon (left), White Tiger (right).' },
    ],
    [
      { zh: '玄空風水以「三元九運」劃分時間週期，每運二十年', en: 'Xuan Kong Feng Shui divides time into the "Three Eras, Nine Periods" system — each period lasting 20 years.' },
      { zh: '2024年起進入九運（離火運），未來二十年文化、科技、美學將成主流', en: 'From 2024, we enter Period 9 (Li Fire) — culture, technology, and aesthetics will dominate the next 20 years.' },
      { zh: '風水羅盤（羅經）是風水師最重要的工具，包含多達三十六層資訊', en: 'The Feng Shui compass (Luopan) is the master\'s essential tool, containing up to 36 layers of information.' },
      { zh: '「明堂」指屋前開闊之地，象徵前途與機遇，宜寬敞平坦', en: 'The "Bright Hall" (Ming Tang) is the open area before a building, symbolizing prospects and opportunity.' },
    ],
  ],
}

// Get a random playlist for a given type
export function getRandomPlaylist(type: string): TipPlaylist {
  const playlists = divinationTips[type]
  if (!playlists || playlists.length === 0) return []
  return playlists[Math.floor(Math.random() * playlists.length)]
}
