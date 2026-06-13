export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Envelope validation only (malformed JSON → clean 400; bounded array).
// Per-message shape stays filter-based below — invalid entries are dropped,
// not rejected, preserving the existing client contract.
const chatBodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(200),
})

/**
 * POST /api/readings/:id/chat
 * Append chat messages to a reading's chatMessages field.
 * Body: { messages: ChatMessage[] }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = chatBodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 })
  }
  const messages = parsed.data.messages as ChatMessage[]

  // Validate message format
  const validMessages = messages.filter(m =>
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' && m.content.length > 0 && m.content.length < 5000
  ).map(m => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp || new Date().toISOString(),
  }))

  if (validMessages.length === 0) {
    return NextResponse.json({ error: 'No valid messages' }, { status: 400 })
  }

  const reading = await prisma.reading.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { id: true, chatMessages: true },
  })

  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Append to existing messages
  let existing: ChatMessage[] = []
  if (reading.chatMessages) {
    try { existing = JSON.parse(reading.chatMessages) } catch { /* ignore */ }
  }

  const updated = [...existing, ...validMessages]

  // Cap at 100 messages to prevent abuse
  const capped = updated.slice(-100)

  await prisma.reading.update({
    where: { id },
    data: { chatMessages: JSON.stringify(capped) },
  })

  return NextResponse.json({ success: true, count: capped.length })
}

/**
 * GET /api/readings/:id/chat
 * Get chat messages for a reading.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const reading = await prisma.reading.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
    select: { chatMessages: true },
  })

  if (!reading) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let messages: ChatMessage[] = []
  if (reading.chatMessages) {
    try { messages = JSON.parse(reading.chatMessages) } catch { /* ignore */ }
  }

  return NextResponse.json({ messages })
}
