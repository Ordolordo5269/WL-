import { prisma } from '../../db/client';

export async function findByIso3(iso3: string) {
  return prisma.entity.findFirst({
    where: { type: 'COUNTRY', iso3 },
    select: {
      id: true,
      name: true,
      iso3: true,
      iso2: true,
      region: true,
      subregion: true,
      props: true,
    },
  });
}

export async function countConflictsByIso3(iso3: string) {
  return prisma.conflict.count({
    where: {
      OR: [
        { country: { contains: iso3, mode: 'insensitive' } },
        { involvedISO: { has: iso3 } },
      ],
    },
  });
}

export async function findLatestIndicators(entityId: string) {
  // Get the most recent value per indicator for this entity
  return prisma.indicatorValue.findMany({
    where: { entityId },
    orderBy: { year: 'desc' },
    distinct: ['indicatorCode'],
    select: {
      indicatorCode: true,
      value: true,
      year: true,
      indicator: { select: { name: true, unit: true } },
    },
  });
}
