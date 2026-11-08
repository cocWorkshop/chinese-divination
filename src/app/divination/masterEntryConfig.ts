export interface MasterEntryConfig {
  title: string
  role: string
  badge: string
  description: string
  ctaButton: string
}

export interface QuickPrompt {
  id: string
  icon: string
  label: string
  prompt: string
}

export function getMasterEntryConfig(lang: string): MasterEntryConfig {
  if (lang === 'en') {
    return {
      title: 'Master Xuanji',
      role: 'Destiny Consultant & Advisor',
      badge: 'Master Xuanji',
      description: 'Ask Master Xuanji anything directly, or choose a classical divination method below.',
      ctaButton: 'Ask Master',
    }
  }

  return {
    title: '玄機大師',
    role: '命理總顧問',
    badge: '玄機',
    description: '心有困惑，直問玄機大師；或自選下方六大正統術數起盤。',
    ctaButton: '向大師提問',
  }
}

export function getMasterQuickPrompts(lang: string): QuickPrompt[] {
  if (lang === 'en') {
    return [
      {
        id: 'recommend',
        icon: '✦',
        label: 'Help me choose',
        prompt: 'I have a question, but I am not sure which oracle or divination method is best suited for it. Can you help me choose?',
      },
      {
        id: 'fortune',
        icon: '✦',
        label: 'Overall forecast',
        prompt: 'Master Xuanji, can you provide an overarching outlook on my fortune and upcoming developments?',
      },
      {
        id: 'career',
        icon: '✦',
        label: 'Career change',
        prompt: 'Master Xuanji, I would like guidance on my recent career path and whether a job change is favorable right now.',
      },
      {
        id: 'relationship',
        icon: '✦',
        label: 'Love & Marriage',
        prompt: 'Master Xuanji, I would like insights on my romantic prospects and marriage timing.',
      },
    ]
  }

  return [
    {
      id: 'recommend',
      icon: '✦',
      label: '幫我挑選術數',
      prompt: '我心裡有些困惑，不知哪種占卜或命理術數最適合我現在的問題，請大師為我指引。',
    },
    {
      id: 'fortune',
      icon: '✦',
      label: '近期綜合運勢',
      prompt: '玄機大師，請為我推演並指引近期的綜合運勢與重要注意事項。',
    },
    {
      id: 'career',
      icon: '✦',
      label: '事業跳槽吉凶',
      prompt: '玄機大師，我想問近期事業發展與工作變動吉凶，請為我參詳指引。',
    },
    {
      id: 'relationship',
      icon: '✦',
      label: '感情正緣應期',
      prompt: '玄機大師，我想問我的感情婚姻與正緣時機，請為我推演指引。',
    },
  ]
}

export interface MasterEntryActionParams {
  masterEnabled: boolean
  prompt?: string
  routerPush: (url: string) => void
  setShape: (shape: 'collapsed' | 'expanded') => void
  sendMessage?: (text: string) => void | Promise<void>
}

export function handleMasterEntryAction({
  masterEnabled,
  prompt,
  routerPush,
  setShape,
  sendMessage,
}: MasterEntryActionParams): void {
  if (!masterEnabled) {
    routerPush('/login?callbackUrl=' + encodeURIComponent('/divination'))
    return
  }

  setShape('expanded')
  if (prompt && sendMessage) {
    void sendMessage(prompt)
  }
}
