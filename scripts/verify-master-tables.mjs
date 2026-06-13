import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// Verify new tables exist by querying them — empty results are fine, errors mean missing
const checks = [
  ['masterChatMessage', () => p.masterChatMessage.count()],
  ['userPortrait', () => p.userPortrait.count()],
  ['userPortraitHistory', () => p.userPortraitHistory.count()],
  ['adminAccessLog', () => p.adminAccessLog.count()],
]

for (const [name, fn] of checks) {
  try {
    const c = await fn()
    console.log(`✓ ${name}: count = ${c}`)
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`)
  }
}

// Verify new User columns exist
try {
  const u = await p.user.findFirst({
    select: { id: true, email: true, portraitEnabled: true, masterMemoryDisclosureSeenAt: true },
  })
  console.log(`✓ User.portraitEnabled (sample): ${u?.portraitEnabled}`)
  console.log(`✓ User.masterMemoryDisclosureSeenAt (sample): ${u?.masterMemoryDisclosureSeenAt}`)
} catch (e) {
  console.log(`✗ User columns: ${e.message}`)
}

// Verify existing data is intact
const stats = {
  users: await p.user.count(),
  readings: await p.reading.count(),
  familyMembers: await p.familyMember.count(),
  masterSessions: await p.masterSession.count(),
}
console.log('Existing data preserved:', stats)

await p.$disconnect()
