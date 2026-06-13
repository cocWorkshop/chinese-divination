import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const user = await p.user.findFirst({ where: { email: 'zhangweicalm@gmail.com' }, select: { id: true, email: true } })
if (!user) { console.log('no user'); process.exit(0) }
const s = await p.masterSession.findUnique({ where: { userId: user.id } })
if (!s) { console.log('no session'); process.exit(0) }
let msgs = []
try { msgs = JSON.parse(s.messages) } catch {}
console.log('userId:', user.id)
console.log('session msgs count:', msgs.length)
for (const [i, m] of msgs.entries()) {
  const preview = (m.content || '').slice(0, 120).replace(/\n/g, ' ')
  console.log(`[${i}] ${m.role}: ${preview}${(m.content || '').length > 120 ? '…' : ''}`)
}
await p.$disconnect()
