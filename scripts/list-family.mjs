import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const user = await p.user.findFirst({ where: { email: 'zhangweicalm@gmail.com' }, select: { id: true } })
const rows = await p.familyMember.findMany({
  where: { userId: user.id },
  select: { id: true, relation: true, name: true, birthDate: true },
})
console.log(rows)
await p.$disconnect()
