import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const user = await p.user.findFirst({ where: { email: 'zhangweicalm@gmail.com' }, select: { id: true } })
const s = await p.masterSession.findUnique({ where: { userId: user.id } })
const msgs = JSON.parse(s.messages)
console.log('total:', msgs.length)
const last = msgs[msgs.length - 1]
console.log('last msg role:', last.role)
console.log('last content length:', (last.content || '').length)
console.log('last content preview:', (last.content || '').slice(0, 500))
console.log('last toolCalls:', JSON.stringify(last.toolCalls, null, 2))
await p.$disconnect()
