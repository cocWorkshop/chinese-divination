import { describe, it, expect } from 'vitest'
import { schemaToLLMTemplate } from '../_toLLMTemplate'
import { fallbackSchema } from '../fallback.schema'
import { ichingSchema } from '../iching.schema'
import { fengshuiSchema } from '../fengshui.schema'
import { qimenSchema } from '../qimen.schema'
import { liuyaoSchema } from '../liuyao.schema'
import { meihuaSchema } from '../meihua.schema'
import { baziSchema } from '../bazi.schema'
import { ziweiSchema } from '../ziwei.schema'

describe('schemaToLLMTemplate', () => {
  it('fallback schema matches original', () => {
    const original = {
      type: 'other',
      sections: {
        overview: '整体分析(150+字)',
        key: '关键要点(100+字)',
        advice: '建议(100+字)',
      },
      keyAdvice: ['建议一', '建议二', '建议三'],
      outcome: '吉/凶/中',
    }
    expect(schemaToLLMTemplate(fallbackSchema)).toEqual(original)
  })

  it('iching schema matches original', () => {
    const original = {
      type: 'iching',
      hexagram: {
        number: 1,
        name: '卦名(单字)',
        chineseName: '卦全名如风雷益',
        upperTrigram: { name: '上卦名', symbol: '☰', element: '风/雷/水/火/山/泽/天/地' },
        lowerTrigram: { name: '下卦名', symbol: '☷', element: '五行' },
        lines: [1, 0, 1, 1, 0, 1],
      },
      judgment: '卦辞原文',
      image: '象辞解析',
      interpretation: '针对问题的解读(100+字)',
      changingLines: [{ position: 3, text: '变爻说明' }],
      advice: '具体建议(100+字)',
      outcome: '吉/凶/中/大吉/小凶',
      keyPoints: ['要点一', '要点二', '要点三'],
    }
    expect(schemaToLLMTemplate(ichingSchema)).toEqual(original)
  })

  it('fengshui schema matches original', () => {
    const original = {
      type: 'fengshui',
      flyingStar: { facing: '坐向如坐北朝南', period: '一运到九运', mountainStar: '山星数字', waterStar: '向星数字' },
      rooms: [{ room: '房间名', energy: '旺/平/衰/煞', suggestion: '建议' }],
      sections: {
        overall: '整体格局(100+字)',
        wealth: '财位(100+字)',
        health: '健康(100+字)',
        relationships: '人际感情(100+字)',
      },
      remedies: [{ issue: '问题', solution: '解决方案' }],
      keyAdvice: ['建议一', '建议二'],
    }
    expect(schemaToLLMTemplate(fengshuiSchema)).toEqual(original)
  })

  it('qimen schema matches original', () => {
    const original = {
      type: 'qimen',
      palace: { inquiry: '问事宫', outcome: '结果宫', god: '值符神', star: '值符星', door: '当值门' },
      sections: {
        situation: '当前局势(100+字)',
        trend: '事态走向(100+字)',
        timing: '最佳时机(100+字)',
        strategy: '行动策略(100+字)',
      },
      outcome: '吉/凶/中',
      keyAdvice: ['建议一', '建议二'],
      luckyInfo: { timing: '宜在...', direction: '向...方行动' },
    }
    expect(schemaToLLMTemplate(qimenSchema)).toEqual(original)
  })

  it('liuyao schema matches original', () => {
    const original = {
      type: 'liuyao',
      guaCi: '卦辞原文及解析(100字以上)',
      yaoCi: '相关爻辞解析(100字以上，重点变爻)',
      interpretation: '针对问题的综合解读(200字以上)',
      sixRelativeAnalysis: '六亲分析：用神、原神、忌神、仇神关系(150字以上)',
      shiYingAnalysis: '世应分析(100字以上)',
      changingAnalysis: '变卦分析(若有变爻，100字以上)',
      timing: '应期判断：事情可能发生的时间(50字以上)',
      advice: '具体建议(100字以上)',
      outcome: '吉/凶/中/大吉/小凶',
      keyPoints: ['要点一', '要点二', '要点三'],
    }
    expect(schemaToLLMTemplate(liuyaoSchema)).toEqual(original)
  })

  it('meihua schema matches original base', () => {
    const original = {
      subType: 'meihua',
      trigrams: {
        upper: { name: '卦名', symbol: '☰', element: '五行' },
        lower: { name: '卦名', symbol: '☷', element: '五行' },
        transformed: { name: '卦名', symbol: '☵', element: '五行' },
      },
      sections: {
        situation: '体卦分析(100+字)',
        inquiry: '用卦分析(100+字)',
        interaction: '体用关系(100+字)',
        timeline: '时间推断(100+字)',
      },
      outcome: '吉/凶/中',
      keyAdvice: ['建议一', '建议二', '建议三'],
    }
    expect(schemaToLLMTemplate(meihuaSchema)).toEqual(original)
  })

  it('bazi schema matches original', () => {
    const original = {
      type: 'bazi',
      pillars: {
        year: { stem: '天干', branch: '地支', element: '五行属性(金/木/水/火/土)', nayin: '纳音' },
        month: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
        day: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
        hour: { stem: '天干', branch: '地支', element: '五行属性', nayin: '纳音' },
      },
      dayMaster: { stem: '日主天干', element: '五行属性', strength: 'strong|weak|neutral', strengthLabel: '身强/身弱/中和' },
      fiveElements: { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 },
      luckyElements: ['喜用五行'],
      avoidElements: ['忌神五行'],
      sections: {
        overview: '命主性格与出身分析(200+字)：日主强弱、性格特征、家庭出身、六亲关系',
        career: '事业官运分析(150+字)：适合行业、发展方向、贵人运',
        marriage: '婚姻感情分析(150+字)：配偶特征、婚姻质量、感情运势',
        wealth: '财运分析(150+字)：正财偏财、理财建议、财运高峰期',
        health: '健康分析(100+字)：易患疾病、养生建议',
        daYunDetail: '大运精批(300+字)：逐个分析每步大运（共8步），点出每步大运的重点领域和需注意的流年。格式：每步大运单独一段，标注起止年份',
      },
      keyAdvice: ['建议一', '建议二', '建议三'],
      luckyInfo: { numbers: [1, 2], colors: ['颜色'], directions: ['方位'] },
    }
    expect(schemaToLLMTemplate(baziSchema)).toEqual(original)
  })

  it('ziwei schema matches original', () => {
    const original = {
      type: 'ziwei',
      mainStars: [{ name: '紫微', palace: '命宫', element: '土' }],
      patterns: [{ name: '格局名', level: '上格/中格/下格', description: '格局说明' }],
      palaces: {
        '命宫': { stars: ['星名'], analysis: '分析(80-120字)' },
        '财帛': { stars: [], analysis: '' },
        '官禄': { stars: [], analysis: '' },
        '夫妻': { stars: [], analysis: '' },
        '兄弟': { stars: [], analysis: '' },
        '子女': { stars: [], analysis: '' },
        '疾厄': { stars: [], analysis: '' },
        '迁移': { stars: [], analysis: '' },
        '仆役': { stars: [], analysis: '' },
        '田宅': { stars: [], analysis: '' },
        '福德': { stars: [], analysis: '' },
        '父母': { stars: [], analysis: '' },
      },
      sections: {
        overview: '命盘总论：格局判定+命宫主星+身宫+五行局',
        personality: '性格深析：命宫(外在)vs福德宫(内在)对比',
        career: '事业分析：官禄宫+三方四正+适合行业',
        marriage: '婚姻分析：配偶特征推断+婚姻模式+最佳婚期',
        wealth: '财运分析：正财偏财+理财方式+财运高峰低谷期',
        health: '健康分析：疾厄宫主星对应身体系统+注意年龄段',
        family: '六亲分析：父母/兄弟/子女特征推断',
        dayun: '大运精批：逐个大运分析，标注当前大运',
      },
      keyPredictions: [{ age: '28岁', event: '事件描述', basis: '命理依据' }],
      keyAdvice: ['建议一', '建议二'],
      luckyInfo: { numbers: [], colors: [], directions: [] },
    }
    expect(schemaToLLMTemplate(ziweiSchema)).toEqual(original)
  })
})
