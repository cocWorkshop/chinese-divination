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
  const isEn = lang === 'en'
  if (isEn) {
    return {
      title: 'Master Xuanji',
      role: 'Destiny Consultant & Synthesis',
      badge: 'Holistic Oracle Synthesis',
      description:
        'Unsure which oracle fits your question? Master Xuanji synthesizes insights across BaZi, Zi Wei, Liu Yao, and I Ching to provide personalized guidance.',
      ctaButton: 'Consult Master Xuanji',
    }
  }

  return {
    title: '玄機大師',
    role: '命理總顧問 · 天地合參',
    badge: '全盤合參 · 叩問玄機',
    description:
      '心有疑惑、不知該選哪種術數？玄機大師縱覽生辰八字、紫微星盤與周易卦象，跨法參詳，指引迷津。',
    ctaButton: '登堂請益 · 叩問玄機',
  }
}

export function getMasterQuickPrompts(lang: string): QuickPrompt[] {
  const isEn = lang === 'en'
  if (isEn) {
    return [
      {
        id: 'recommend',
        icon: '🧭',
        label: 'Help me choose',
        prompt: 'I have a question, but I am not sure which oracle or divination method is best suited for it. Can you help me choose?',
      },
      {
        id: 'fortune',
        icon: '✨',
        label: 'Comprehensive forecast',
        prompt: 'Master Xuanji, can you provide an overarching outlook on my fortune and upcoming developments?',
      },
      {
        id: 'synthesis',
        icon: '☯',
        label: 'Multi-chart synthesis',
        prompt: 'Can you analyze my recent charts and synthesis insights across BaZi, Zi Wei, and divination hexagrams for me?',
      },
    ]
  }

  return [
    {
      id: 'recommend',
      icon: '🧭',
      label: '不知如何擇術？',
      prompt: '我心裡有些困惑，不知哪種占卜或命理術數最適合我現在的問題，請大師為我指引。',
    },
    {
      id: 'fortune',
      icon: '✨',
      label: '近期綜合運勢',
      prompt: '玄機大師，請為我推演並指引近期的綜合運勢與重要注意事項。',
    },
    {
      id: 'synthesis',
      icon: '☯',
      label: '跨法合參解盤',
      prompt: '請幫我整合八字、紫微與各項占卜記錄進行跨盤合參，給出全局建議。',
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
