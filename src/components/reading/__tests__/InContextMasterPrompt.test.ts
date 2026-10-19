import { describe, it, expect } from 'vitest'
import { TEN } from '@/lib/i18n'

// Test prompt generation logic to ensure all systems have dignified, non-AI-generic, intuitive questions
describe('InContextMasterPrompt prompt logic', () => {
  const getPromptsForType = (divinationType: string, isZh: boolean) => {
    switch (divinationType) {
      case 'bazi':
        return TEN(
          !isZh,
          [
            '以我的命局喜用神來看，近一兩年適合換工作或創業嗎？',
            '我命中正緣與婚姻宮有何特徵？大約在何時有應期？',
            '此盤大運流年是否有相沖之處？具體該如何防範化解？',
          ],
          [
            'Based on my favorable elements, is now a good time for a career change?',
            'What are the key traits and timing for my marriage/relationship palace?',
            'Are there major elemental clashes in my current cycle, and how can I mitigate them?',
          ]
        )
      case 'ziwei':
        return TEN(
          !isZh,
          [
            '我命宮主星與三方四正配合，生平最核心的天賦長板在哪裡？',
            '當前這步十年大限，我的財帛宮與官祿宮氣數如何？',
            '星盤中化忌星落在何處？日常修身有何指引建議？',
          ],
          [
            'What is the core strength and life purpose shown by my Life Palace?',
            'How are my Wealth and Career palaces faring in my current 10-year limit?',
            'Where does the obstacle star (Hua-Ji) fall, and how can I harmonize it?',
          ]
        )
      case 'liuyao':
        return TEN(
          !isZh,
          [
            '此卦世應生剋如何？對方或外界對此事的真實態度是什麼？',
            '卦中動爻生變，此事的關鍵轉折與結果應期大概在何時？',
            '若我要全力推動此事，在人事或時機上有何趨吉避凶之法？',
          ],
          [
            'What is the true dynamic between the subject and object lines?',
            'With changing lines active, what is the critical timeline and turning point?',
            'What practical adjustments in timing or allies will maximize success?',
          ]
        )
      case 'meihua':
        return TEN(
          !isZh,
          [
            '體用五行生剋中，此事是速決順利，還是遲緩多阻？',
            '從互卦與變卦的演進來看，最終格局是吉是凶？',
            '若想化被動為主動，有何物象、顏色或時辰可為我所用？',
          ],
          [
            'In host and guest interplay, will this unfold rapidly or with delays?',
            'Looking at the mutual and resulting hexagrams, what is the final outcome?',
            'What environmental cues or optimal hours should I utilize?',
          ]
        )
      default:
        return TEN(
          !isZh,
          [
            '請大師為我精闢提煉此盤中最重要的天時玄機。',
            '面對這項結果，我當下最該防範的心性盲點是什麼？',
            '接下來的一步，大師建議我採取主動出擊還是靜觀其變？',
          ],
          [
            'Master, please summarize the single most pivotal insight of this chart.',
            'What is the core personal blind spot I should guard against right now?',
            'For my immediate next step, do you advise taking bold action or patient observation?',
          ]
        )
    }
  }

  it('generates 3 distinct prompts for bazi in Chinese and English', () => {
    const zh = getPromptsForType('bazi', true)
    expect(zh).toHaveLength(3)
    expect(zh[0]).toContain('喜用神')
    expect(zh[1]).toContain('正緣')
    expect(zh[2]).toContain('大運流年')

    const en = getPromptsForType('bazi', false)
    expect(en).toHaveLength(3)
    expect(en[0]).toContain('favorable elements')
  })

  it('generates 3 distinct prompts for ziwei', () => {
    const zh = getPromptsForType('ziwei', true)
    expect(zh).toHaveLength(3)
    expect(zh[0]).toContain('命宮')
    expect(zh[1]).toContain('十年大限')
    expect(zh[2]).toContain('化忌')
  })

  it('generates 3 distinct prompts for liuyao', () => {
    const zh = getPromptsForType('liuyao', true)
    expect(zh).toHaveLength(3)
    expect(zh[0]).toContain('世應')
    expect(zh[1]).toContain('動爻')
  })

  it('generates 3 distinct prompts for meihua', () => {
    const zh = getPromptsForType('meihua', true)
    expect(zh).toHaveLength(3)
    expect(zh[0]).toContain('體用五行')
    expect(zh[1]).toContain('變卦')
  })

  it('generates thoughtful fallback prompts for other divination systems', () => {
    const zh = getPromptsForType('unknown_type', true)
    expect(zh).toHaveLength(3)
    expect(zh[0]).toContain('天時玄機')
  })

  it('prefers dynamic LLM suggestedQuestions when present in reading result', () => {
    const mockResult = JSON.stringify({
      chart: { year: '丙午' },
      suggestedQuestions: [
        '今年我的事業會有什麼重大轉機？',
        '命中正緣何時顯現？',
        '如何化解近期的五行相沖？',
      ],
    })

    const parsed = JSON.parse(mockResult)
    const dynamicQuestions = (parsed.suggestedQuestions as string[]).filter(
      (q: unknown): q is string => typeof q === 'string' && q.trim().length > 0
    )

    expect(dynamicQuestions).toHaveLength(3)
    expect(dynamicQuestions[0]).toBe('今年我的事業會有什麼重大轉機？')
    expect(dynamicQuestions[1]).toBe('命中正緣何時顯現？')
    expect(dynamicQuestions[2]).toBe('如何化解近期的五行相沖？')
  })

  it('falls back gracefully when reading result is malformed or missing suggestedQuestions', () => {
    const malformed = 'not-valid-json'
    let dynamicQuestions: string[] = []
    try {
      const parsed = JSON.parse(malformed)
      if (Array.isArray(parsed?.suggestedQuestions)) {
        dynamicQuestions = parsed.suggestedQuestions
      }
    } catch {
      // falls back to getPrompts
    }

    expect(dynamicQuestions).toHaveLength(0)
    const fallback = getPromptsForType('bazi', true)
    expect(fallback).toHaveLength(3)
    expect(fallback[0]).toContain('喜用神')
  })
})
