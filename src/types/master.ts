export interface UserPortrait {
  birthInfo?: {
    solarDate?: string
    lunarDate?: string
    birthTime?: string
    birthPlace?: string
    gender?: string
  }
  family?: {
    spouse?: { name?: string; birthInfo?: string; status?: string }
    children?: { name?: string; birthInfo?: string; age?: number }[]
    parents?: { status?: string; health?: string }[]
  }
  currentSituation?: {
    career?: string
    location?: string
    concerns?: string[]
    recentEvents?: string[]
  }
  destinyTraits?: {
    baziSummary?: string
    ziweiSummary?: string
    keyPatterns?: string[]
  }
  preferences?: {
    topicsOfInterest: string[]
    communicationStyle?: string
    beliefLevel?: string
  }
  lastUpdated: string
  totalSessions: number
  summaryNotes?: string
}

export interface MasterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolCalls?: { name: string; args: Record<string, unknown>; result?: unknown }[]
}

export interface MasterTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}
