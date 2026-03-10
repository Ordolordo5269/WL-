/**
 * Seed two AcledConflict records for testing:
 *  1. Ukraine War (2022–present)
 *  2. Sudan Civil War (2023–present)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const conflicts = [
  {
    slug: 'ukraine-war',
    name: 'Ukraine War',
    country: 'Ukraine',
    region: 'Europe',
    description:
      'Full-scale Russian invasion of Ukraine that began on 24 February 2022, escalating the Russo-Ukrainian conflict that started in 2014. The war involves large-scale conventional battles, missile strikes on civilian infrastructure, and occupation of Ukrainian territory.',
    status: 'WAR' as const,
    filterCountry: 'Ukraine',
    filterIso: 804,
    filterActors: [],
    filterDateFrom: new Date('2022-02-24'),
    filterDateTo: null,
    involvedISO: ['UKR', 'RUS'],
    coordinates: { lat: 48.38, lng: 31.17 },
    startDate: new Date('2022-02-24'),
    escalationDate: new Date('2022-02-24'),
    endDate: null,
    sources: ['ACLED', 'OSCE', 'UNHCR', 'ISW'],
  },
  {
    slug: 'sudan-civil-war',
    name: 'Sudan Civil War',
    country: 'Sudan',
    region: 'Northern Africa',
    description:
      'Armed conflict between the Sudanese Armed Forces (SAF) led by Abdel Fattah al-Burhan and the Rapid Support Forces (RSF) paramilitary led by Mohamed Hamdan Dagalo (Hemedti). The war has caused massive displacement and a humanitarian crisis.',
    status: 'WAR' as const,
    filterCountry: 'Sudan',
    filterIso: 729,
    filterActors: [],
    filterDateFrom: new Date('2023-04-15'),
    filterDateTo: null,
    involvedISO: ['SDN'],
    coordinates: { lat: 15.5, lng: 32.56 },
    startDate: new Date('2023-04-15'),
    escalationDate: new Date('2023-04-15'),
    endDate: null,
    sources: ['ACLED', 'UNHCR', 'OCHA'],
  },
];

async function main() {
  for (const c of conflicts) {
    const result = await prisma.acledConflict.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        country: c.country,
        region: c.region,
        description: c.description,
        status: c.status,
        filterCountry: c.filterCountry,
        filterIso: c.filterIso,
        filterActors: c.filterActors,
        filterDateFrom: c.filterDateFrom,
        filterDateTo: c.filterDateTo,
        involvedISO: c.involvedISO,
        coordinates: c.coordinates,
        startDate: c.startDate,
        escalationDate: c.escalationDate,
        endDate: c.endDate,
        sources: c.sources,
      },
      create: c,
    });
    console.log(`✔ ${result.name} (${result.slug}) — id: ${result.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
