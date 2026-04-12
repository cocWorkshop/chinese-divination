import { readFileSync } from 'node:fs'
// Parse .env.local for OPENROUTER_API_KEY
const envLocal = readFileSync('.env.local', 'utf8')
const apiKey = envLocal.match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1]?.replace(/^['"]|['"]$/g, '')
if (!apiKey) { console.error('no key'); process.exit(1) }

import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const user = await p.user.findFirst({ where: { email: 'zhangweicalm@gmail.com' }, select: { id: true } })
const s = await p.masterSession.findUnique({ where: { userId: user.id } })
const history = JSON.parse(s.messages)
await p.$disconnect()

// Build messages like the master route does: system + history + new user turn
const systemPrompt = 'You are Master Xuanji, a Chinese divination expert. Be brief.'
const messages = [
  { role: 'system', content: systemPrompt },
  ...history.map(m => ({ role: m.role, content: m.content })),
  { role: 'user', content: '我最近对未来有些迷茫，想了解一下自己的命运走向，你能帮我看看吗？' },
]

const body = {
  model: 'openai/gpt-5.4',
  max_tokens: 1000,
  messages,
  tools: [
    { type: 'function', function: { name: 'get_user_profile', description: 'Get user birth profile', parameters: { type: 'object', properties: {}, required: [] } } },
  ],
  reasoning: { effort: 'low' },
  stream: false,
}

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:8088',
    'X-Title': 'Xuanji Master',
  },
  body: JSON.stringify(body),
})
console.log('status:', res.status)
const text = await res.text()
console.log('body:', text.slice(0, 4000))
