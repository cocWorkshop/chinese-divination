/**
 * Centralized Guidance, Demonstrations, and Explanations for Divination Forms
 * Addresses Issue #125 / Issue #142 requirements for user orientation and clarification.
 */

export const PAIPAN_EXPLANATION = {
  buttonLabel: {
    zh: '只排盤（無AI解盤）',
    en: 'Chart Only (No AI interpretation)',
  },
  fullReadingLabel: {
    zh: '完整解盤',
    en: 'Full Reading',
  },
  tooltip: {
    zh: '【只排盤說明】此模式僅計算並展示命盤干支/星曜數據，不扣除機緣，亦不進行 AI 深度解盤與吉凶分析。適合已有命理基礎的專業研究者。',
    en: '[Chart Only Note] Calculates and displays raw astrological chart data and pillars only, skipping the AI reading report. Suitable for experienced astrologers.',
  },
}

export const EARLY_LATE_ZI_EXPLANATION = {
  label: {
    zh: '早晚子時說明',
    en: 'Early / Late Zi Hour',
  },
  tooltip: {
    zh: '【早晚子時說明】僅供子時（23:00-01:00）出生且感覺自己當前日柱不準的人選擇使用。在中國古代曆法中，23:00-00:00 為晚子時（夜子時），00:00-01:00 為早子時。部分門派認為夜子時已換日柱，部分門派認為子時過半（00:00）方換日柱。',
    en: '[Early/Late Zi Explanation] For individuals born between 23:00-01:00. Ancient calendar traditions vary on whether the day pillar rolls over at 23:00 (Night Zi) or midnight 00:00 (Early Zi). Choose to fine-tune your day pillar.',
  },
}

export const LIUYAO_CAST_PRINCIPLE = {
  title: {
    zh: '銅錢起卦原理與感應指導',
    en: 'Principle & Guidance of Coin Casting',
  },
  content: {
    zh: '六爻搖卦原理：以三枚銅錢連擲六次，相通天地人三才之動靜機先。心中默念所問之事（一事一占），手擲銅錢，借助萬物同頻共振呈現六個爻象，從而洞察事物發展的吉凶契機與轉化之道。',
    en: 'Liu Yao Coin Principle: Tossing 3 coins 6 times reflects the universal tri-forces of Heaven, Earth, and Humanity. Focus deeply on one specific inquiry; the physical tosses capture cosmic synchronicity across the 6 lines, unveiling the hidden dynamics, auspicious timing, and pathways of transformation.',
  },
}

export const FENGSHUI_DEMO_EXAMPLE = {
  title: {
    zh: '輸入示範範例',
    en: 'Demonstrative Example',
  },
  applyLabel: {
    zh: '點此填入示範範例',
    en: 'Fill with this example',
  },
  exampleDirection: 'S', // 正南
  exampleYear: 2008,
  exampleOwnerInfo: {
    zh: '居住者性別男，生於1990年，房屋大門朝向正南（午山子向），主要的客廳大窗朝向東南，主臥位於西北方，想諮詢事業財運與安神助眠氣場調理。',
    en: 'Occupant male, born 1990, main entrance door facing South, main living room window facing Southeast, master bedroom in Northwest. Seeking to optimize career wealth flow and restful sleep energy.',
  },
}
