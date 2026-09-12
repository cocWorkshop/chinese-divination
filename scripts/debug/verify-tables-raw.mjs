import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// Use raw SQL to verify tables exist — bypasses stale generated types
const tables = ['MasterChatMessage', 'UserPortrait', 'UserPortraitHistory', 'AdminAccessLog']
for (const t of tables) {
  try {
    const r = await p.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${t}"`)
    console.log(`✓ ${t}: ${r[0].c} rows`)
  } catch (e) {
    console.log(`✗ ${t}: ${e.message.split('\n')[0]}`)
  }
}

// Verify new User columns
try {
  const r = await p.$queryRawUnsafe(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'User'
    AND column_name IN ('portraitEnabled', 'masterMemoryDisclosureSeenAt')
    ORDER BY column_name
  `)
  for (const row of r) {
    console.log(`✓ User.${row.column_name}: ${row.data_type}, default=${row.column_default}, nullable=${row.is_nullable}`)
  }
} catch (e) {
  console.log(`✗ User columns: ${e.message}`)
}

// Existing data check via raw SQL too
const stats = await p.$queryRawUnsafe(`
  SELECT
    (SELECT COUNT(*)::int FROM "User") as users,
    (SELECT COUNT(*)::int FROM "Reading") as readings,
    (SELECT COUNT(*)::int FROM "FamilyMember") as family_members,
    (SELECT COUNT(*)::int FROM "MasterSession") as master_sessions
`)
console.log('Existing data preserved:', stats[0])

await p.$disconnect()
