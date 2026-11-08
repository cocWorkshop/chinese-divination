'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkCjkFriendly from '@/lib/remarkCjkFriendly'

interface ReadingResultProps {
  content: string
}

export default function ReadingResult({ content }: ReadingResultProps) {
  return (
    <div className="classic-prose max-w-none reading-result">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCjkFriendly]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-serif text-gold border-b border-gold/30 pb-2 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-serif text-gold/90 mt-6 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-serif text-gold/80 mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-[var(--text-secondary)] leading-relaxed mb-3">{children}</p>
          ),
          li: ({ children }) => (
            <li className="text-[var(--text-secondary)] mb-1">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="text-gold font-semibold">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gold/50 pl-4 italic text-[var(--text-muted)]">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
