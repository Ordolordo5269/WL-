import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteGdpIndicatorValues(): Promise<void> {
  const indicatorCode = 'GDP_USD';

  const beforeCount = await prisma.indicatorValue.count({
    where: { indicatorCode },
  });

  const deleteResult = await prisma.indicatorValue.deleteMany({
    where: { indicatorCode },
  });

  const afterCount = await prisma.indicatorValue.count({
    where: { indicatorCode },
  });

  console.log(
    JSON.stringify(
      {
        indicatorCode,
        beforeCount,
        deletedRows: deleteResult.count,
        afterCount,
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  try {
    await deleteGdpIndicatorValues();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to delete GDP indicator values:', error);
  process.exit(1);
});












