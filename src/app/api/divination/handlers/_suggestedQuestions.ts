import { T } from '@/lib/i18n'

/**
 * Language-aware + age/gender-contextualized suggested-question prompts.
 *
 * Each handler calls this from its buildSchema() to override the static
 * suggestedQuestions in its schema template.
 */

export interface SuggestedQuestionsContext {
  age?: number
  gender?: string
}

export function getSuggestedQuestionsPrompt(
  type: string,
  language: string,
  userContext?: SuggestedQuestionsContext
): string[] {
  const maxLen = T(language, '(15字内)', '(max 15 words)')
  const ageGenderHint = userContext?.age
    ? T(
        language,
        `此人为${userContext.gender === 'female' ? '女' : '男'}性，${userContext.age}岁。请结合其年龄阶段（事业、婚姻、子女、健康等）设计最可能引起好奇的问题。`,
        `The subject is ${userContext.gender === 'female' ? 'female' : 'male'}, age ${userContext.age}. Tailor questions to their life stage (career, marriage, children, retirement etc. as appropriate).`,
      )
    : ''

  const promptMap: Record<string, { zh: string[]; en: string[] }> = {
    bazi: {
      zh: [
        `${ageGenderHint}根据此人命局和当前人生阶段，提一个最让人好奇「命中注定」的问题${maxLen}`,
        `${ageGenderHint}此人当前阶段最大的转机或挑战是什么？据此提一个让人想深挖的问题${maxLen}`,
        `${ageGenderHint}此人命中有什么容易忽视的隐患？提一个让人警醒的问题${maxLen}`,
      ],
      en: [
        `${ageGenderHint}Based on this person's chart and life stage, ask a compelling question about their destiny ${maxLen}`,
        `${ageGenderHint}What is the biggest turning point or challenge at their current stage? Ask a thought-provoking question ${maxLen}`,
        `${ageGenderHint}What hidden risk in their chart might they overlook? Ask an alerting question ${maxLen}`,
      ],
    },
    ziwei: {
      zh: [
        `${ageGenderHint}命盘中最强的一颗星暗示了此人当前阶段什么命运走向？据此提问${maxLen}`,
        `${ageGenderHint}哪个宫位藏着此人当前最大的人生变局？据此提问${maxLen}`,
        `${ageGenderHint}命盘中有什么被忽视的贵人或机遇？据此提问${maxLen}`,
      ],
      en: [
        `${ageGenderHint}What does the strongest star in the chart reveal about their current life direction? Ask a question ${maxLen}`,
        `${ageGenderHint}Which palace holds the biggest life change for them now? Ask a question ${maxLen}`,
        `${ageGenderHint}What overlooked opportunity or benefactor exists in their chart? Ask a question ${maxLen}`,
      ],
    },
    iching: {
      zh: [`此卦暗示的最大变数是什么？提一个让人想追问的问题${maxLen}`, `如何借卦象之势扭转局面？提一个实用的破局问题${maxLen}`, `此卦最容易忽略的警示是什么？提一个让人警觉的问题${maxLen}`],
      en: [`What is the biggest variable this hexagram hints at? Ask a compelling question ${maxLen}`, `How to leverage this hexagram to turn things around? Ask a practical question ${maxLen}`, `What warning in this hexagram is easily overlooked? Ask an alerting question ${maxLen}`],
    },
    liuyao: {
      zh: [`卦中用神透露了什么关键信息？提一个让人迫切想知道的问题${maxLen}`, `此卦的应期暗示了什么？提一个关于时机把握的问题${maxLen}`, `世应之间藏着什么玄机？提一个让人意外的破解问题${maxLen}`],
      en: [`What key info does the primary element reveal? Ask an urgent question ${maxLen}`, `What does the timing of this hexagram suggest? Ask a timing question ${maxLen}`, `What hidden dynamics exist between the self and response lines? Ask a revealing question ${maxLen}`],
    },
    qimen: {
      zh: [`此局中最关键的时机窗口在哪？提一个让人想立刻行动的问题${maxLen}`, `奇门格局暗示的最大陷阱是什么？提一个避险问题${maxLen}`, `如何借此局之势实现最大突破？提一个策略性问题${maxLen}`],
      en: [`Where is the critical timing window in this formation? Ask an action-oriented question ${maxLen}`, `What is the biggest trap this Qi Men formation reveals? Ask a risk-avoidance question ${maxLen}`, `How to leverage this formation for maximum breakthrough? Ask a strategic question ${maxLen}`],
    },
    fengshui: {
      zh: [`当前格局中最影响财运的风水要素是什么？据此提问${maxLen}`, `家中哪个方位藏着最大的隐患？提一个化解问题${maxLen}`, `如何用最小的改动获得最大的风水提升？据此提问${maxLen}`],
      en: [`What feng shui element most affects wealth in this layout? Ask a question ${maxLen}`, `Which direction in the home has the biggest hidden risk? Ask a remediation question ${maxLen}`, `How to get the biggest feng shui improvement with minimal changes? Ask a question ${maxLen}`],
    },
    other: {
      zh: [`体用之间的生克揭示了什么关键走向？据此提问${maxLen}`, `此卦最容易被忽略的变数是什么？提一个深入问题${maxLen}`, `如何借势破局？提一个最实用的行动问题${maxLen}`],
      en: [`What key trend does the interaction between body and function trigrams reveal? Ask a question ${maxLen}`, `What easily overlooked variable exists in this hexagram? Ask a deep question ${maxLen}`, `How to seize the momentum to break through? Ask a practical action question ${maxLen}`],
    },
  }

  const prompts = promptMap[type] || promptMap.other
  return T(language, prompts.zh, prompts.en)
}
