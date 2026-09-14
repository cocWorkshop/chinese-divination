import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const { compare, hash } = bcrypt;

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'test@test.com' } });
  if (user && user.password) {
    const isTest1234 = await compare('test1234', user.password);
    const isTest1234Excl = await compare('Test1234!', user.password);
    console.log('Password check:', { isTest1234, isTest1234Excl });
    if (!isTest1234 && !isTest1234Excl) {
      const newHash = await hash('test1234', 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
      console.log('Updated test@test.com password to test1234');
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
