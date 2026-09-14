import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.reading.findUnique({
    where: { id: 'cmtzwkn6600019mb0kckdpmdd' },
  });
  console.log('READING:', {
    id: r?.id,
    type: r?.type,
    shareToken: r?.shareToken,
    userId: r?.userId,
  });

  if (!r?.shareToken) {
    // Generate a share token if none exists
    const updated = await prisma.reading.update({
      where: { id: 'cmtzwkn6600019mb0kckdpmdd' },
      data: { shareToken: 'test-share-token-cmtzwkn66' },
    });
    console.log('UPDATED WITH SHARE TOKEN:', updated.shareToken);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
