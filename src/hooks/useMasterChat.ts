'use client'
import { useState, useCallback, useRef } from 'react'

interface MasterMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ToolStatus {
  name: string
  label: string
}

const toolLabels: Record<string, { zh: string; en: string }> = {
  calculate_bazi: { zh: '排八字中...', en: 'Calculating BaZi...' },
  calculate_ziwei: { zh: '排紫微命盤中...', en: 'Calculating Zi Wei...' },
  calculate_qimen: { zh: '起奇門局中...', en: 'Casting Qi Men...' },
  calculate_meihua: { zh: '起梅花卦中...', en: 'Casting Mei Hua...' },
  calculate_fengshui: { zh: '排飛星盤中...', en: 'Calculating Flying Stars...' },
  get_user_profile: { zh: '查閱檔案中...', en: 'Checking records...' },
  search_readings: { zh: '翻閱舊卷中...', en: 'Reviewing records...' },
  update_portrait: { zh: '記下了...', en: 'Noted...' },
}

export function useMasterChat() {
  const [messages, setMessages] = useState<MasterMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<ToolStatus | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/master')
      if (!res.ok) return
      const data = await res.json()
      if (data.messages?.length) {
        setMessages(data.messages.filter((m: MasterMessage) => m.role !== 'system'))
      }
      if (data.credits !== undefined) setCredits(data.credits)
      setHistoryLoaded(true)
    } catch {
      setHistoryLoaded(true)
    }
  }, [])

  const sendMessage = useCallback(async (content: string, lang: string = 'zh') => {
    const userMsg: MasterMessage = { role: 'user', content, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    const assistantMsg: MasterMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, assistantMsg])

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...assistantMsg, content: err.error || '抱歉，出了點問題。' }
          return updated
        })
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const event = JSON.parse(data)
            if (event.type === 'token') {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = { ...last, content: last.content + event.content }
                return updated
              })
            } else if (event.type === 'tool_start') {
              const labels = toolLabels[event.tool] || { zh: '處理中...', en: 'Processing...' }
              setToolStatus({ name: event.tool, label: lang === 'en' ? labels.en : labels.zh })
            } else if (event.type === 'tool_end') {
              setToolStatus(null)
            } else if (event.type === 'done') {
              if (event.credits !== undefined) setCredits(event.credits)
            } else if (event.type === 'error') {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...assistantMsg, content: event.error || '抱歉，出了點問題。' }
                return updated
              })
            }
          } catch { /* skip malformed events */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...assistantMsg, content: '連接中斷，請重試。' }
          return updated
        })
      }
    } finally {
      setLoading(false)
      setToolStatus(null)
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, loading, toolStatus, credits, historyLoaded, sendMessage, loadHistory, abort }
}
