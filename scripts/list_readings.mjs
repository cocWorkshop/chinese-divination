import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const readings = await prisma.reading.findMany({
    select: { id: true, type: true, shareToken: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('Recent readings:', JSON.stringify(readings, null, 2));

  const users = await prisma.user.findMany({
    select: { id: true, email: true, isAdmin: true, emailVerified: true },
    take: 5,
  });
  console.log('Users in DB:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
