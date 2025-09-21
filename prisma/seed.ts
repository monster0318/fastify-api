
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'founder@example.com' },
    update: {},
    create: { name: 'Marcin W.', email: 'founder@example.com', password: passwordHash }
  });

  await prisma.company.upsert({
    where: { id: 'seed-company' },
    update: {},
    create: {
      id: 'seed-company',
      userId: user.id,
      name: 'Seed Company',
      sector: 'saas',
      targetRaise: 500000,
      revenue: 120000
    }
  });

  console.log('Seed complete');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
