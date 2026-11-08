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
  theme: 'gold' | 'azure' | 'jade' | 'rose' | 'amber' | 'purple'
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
    ctaButton: '請教大師',
  }
}

export function getMasterQuickPrompts(lang: string): QuickPrompt[] {
  if (lang === 'en') {
    return [
      {
        id: 'recommend',
        icon: '✦',
        theme: 'gold',
        label: 'Help me choose',
        prompt: 'I have a question, but I am not sure which oracle or divination method is best suited for it. Can you help me choose?',
      },
      {
        id: 'fortune',
        icon: '✦',
        theme: 'azure',
        label: 'Overall forecast',
        prompt: 'Master Xuanji, can you provide an overarching outlook on my fortune and upcoming developments?',
      },
      {
        id: 'career',
        icon: '✦',
        theme: 'jade',
        label: 'Career change',
        prompt: 'Master Xuanji, I would like guidance on my recent career path and whether a job change is favorable right now.',
      },
      {
        id: 'relationship',
        icon: '✦',
        theme: 'rose',
        label: 'Love & Marriage',
        prompt: 'Master Xuanji, I would like insights on my romantic prospects and marriage timing.',
      },
      {
        id: 'wealth',
        icon: '✦',
        theme: 'amber',
        label: 'Wealth & Timing',
        prompt: 'Master Xuanji, I would like guidance on my financial prospects and investment timing.',
      },
      {
        id: 'decision',
        icon: '✦',
        theme: 'purple',
        label: 'Critical choice',
        prompt: 'Master Xuanji, I am facing an important crossroads decision and would like your counsel on the auspicious path.',
      },
    ]
  }

  return [
    {
      id: 'recommend',
      icon: '✦',
      theme: 'gold',
      label: '幫我挑選術數',
      prompt: '我心裡有些困惑，不知哪種占卜或命理術數最適合我現在的問題，請大師為我指引。',
    },
    {
      id: 'fortune',
      icon: '✦',
      theme: 'azure',
      label: '近期綜合運勢',
      prompt: '玄機大師，請為我推演並指引近期的綜合運勢與重要注意事項。',
    },
    {
      id: 'career',
      icon: '✦',
      theme: 'jade',
      label: '事業求變吉凶',
      prompt: '玄機大師，我想問近期事業發展與工作變動吉凶，請為我參詳指引。',
    },
    {
      id: 'relationship',
      icon: '✦',
      theme: 'rose',
      label: '感情正緣應期',
      prompt: '玄機大師，我想問我的感情婚姻與正緣時機，請為我推演指引。',
    },
    {
      id: 'wealth',
      icon: '✦',
      theme: 'amber',
      label: '財富投資時機',
      prompt: '玄機大師，我想了解近期的財運走勢與投資決策時機，請為我指引。',
    },
    {
      id: 'decision',
      icon: '✦',
      theme: 'purple',
      label: '當下抉擇指引',
      prompt: '玄機大師，我正面臨一個重要抉擇，難以定奪，請為我推演各方利弊契機。',
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
