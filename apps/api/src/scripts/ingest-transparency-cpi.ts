/**
 * Ingest Transparency International CPI — from OWID API
 * Full historical series: 2012-present, ~180 countries, scale 0-100
 */

import { PrismaClient } from '@prisma/client';
import { fetchOWIDData, ensureIndicator, buildEntityLookup, ingestRows } from './lib/owid-parser';

const prisma = new PrismaClient();

// OWID indicator ID 1032554 = Corruption Perceptions Index
const CPI_INDICATOR_ID = 1032554;

async function main() {
  console.log('\n=== WorldLore: CPI Ingestion (OWID API — Full Historical) ===\n');

  await ensureIndicator(prisma, {
    code: 'TI_CPI_SCORE',
    name: 'Corruption Perceptions Index (Score)',
    unit: 'score_0_100',
    topic: 'Politics',
    source: 'Transparency International via OWID',
  });

  const entityLookup = await buildEntityLookup(prisma);
  const rows = await fetchOWIDData(CPI_INDICATOR_ID);
  const count = await ingestRows(prisma, 'TI_CPI_SCORE', 'Transparency International', rows, entityLookup);

  console.log(`\n  Total upserted: ${count} CPI records`);
  console.log('\n=== CPI Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
