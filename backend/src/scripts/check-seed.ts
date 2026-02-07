import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.entity.count();
    const peru = await prisma.entity.findFirst({ where: { iso3: 'PER' } });
    const un = await prisma.entity.findFirst({ where: { slug: 'un' } });
    const paris = await prisma.entity.findFirst({ where: { slug: 'paris-agreement' } });
    console.log(JSON.stringify({ count, hasPeru: !!peru, hasUN: !!un, hasParis: !!paris }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });













