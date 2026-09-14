'use client'

import React, { Component, type ReactNode } from 'react'
import { reportError } from '@/lib/errorReporter'
import { AlertIcon, RefreshIcon } from '@/components/DivinationIcons'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  context?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ResultErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    // Auto-reload on chunk load failure (stale deployment)
    if (this.isChunkLoadError(error)) {
      const key = 'chunk_reload_' + window.location.pathname
      const lastReload = sessionStorage.getItem(key)
      const now = Date.now()
      // Only auto-reload once per path per session (avoid infinite loops)
      if (!lastReload || now - Number(lastReload) > 30000) {
        sessionStorage.setItem(key, String(now))
        window.location.reload()
        return
      }
    }

    reportError({
      endpoint: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      error: error.message || 'Component render error',
      context: `ResultErrorBoundary|${this.props.context || ''}|${error.stack?.slice(0, 500) || ''}`,
    })
  }

  private isChunkLoadError(error: Error): boolean {
    return (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module')
    )
  }

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.error ? this.isChunkLoadError(this.state.error) : false
      return (
        <div className="oriental-sanctuary-card rounded-2xl p-8 text-center my-4 border border-gold/30">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
            <AlertIcon size={24} />
          </div>
          <h3 className="text-lg font-serif text-gold mb-2">
            {isChunk ? '頁面版本已更新' : (this.props.fallbackTitle || '結果顯示異常')}
          </h3>
          <p className="text-white/60 text-sm mb-4">
            {isChunk
              ? '網站剛剛更新了新版本，請刷新頁面即可正常使用。'
              : '此部分內容載入失敗，其他功能不受影響。'}
          </p>
          <button
            onClick={() => isChunk ? window.location.reload() : this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 rounded-lg text-sm font-serif transition-colors"
          >
            <RefreshIcon size={16} />
            <span>{isChunk ? '刷新頁面' : '重試'}</span>
          </button>
          {this.state.error && (
            <details className="mt-4 text-left">
              <summary className="text-white/30 text-xs cursor-pointer">技術詳情</summary>
              <pre className="text-white/20 text-xs mt-2 overflow-auto max-h-32 p-2 rounded bg-black/30">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
