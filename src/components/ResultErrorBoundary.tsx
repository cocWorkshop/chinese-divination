'use client'

import React, { Component, type ReactNode } from 'react'
import { reportError } from '@/lib/errorReporter'

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
    reportError({
      endpoint: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      error: error.message || 'Component render error',
      context: `ResultErrorBoundary|${this.props.context || ''}|${error.stack?.slice(0, 500) || ''}`,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-2xl p-8 text-center my-4">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-serif text-gold mb-2">
            {this.props.fallbackTitle || '結果顯示異常'}
          </h3>
          <p className="text-white/50 text-sm mb-4">
            此部分內容載入失敗，其他功能不受影響。
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
          >
            重試
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
