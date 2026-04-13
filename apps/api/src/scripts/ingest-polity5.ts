/**
 * Ingest Polity5 Regime Score — from OWID API
 * Full historical series: 1800-2020, ~170 countries
 * Score: -10 (full autocracy) to +10 (full democracy)
 * Note: Polity5 discontinued in 2020.
 */

import { PrismaClient } from '@prisma/client';
import { fetchOWIDData, ensureIndicator, buildEntityLookup, ingestRows } from './lib/owid-parser';

const prisma = new PrismaClient();

// OWID indicator ID 901272 = Polity combined score
const POLITY_INDICATOR_ID = 901272;

async function main() {
  console.log('\n=== WorldLore: Polity5 Ingestion (OWID API — Full Historical) ===\n');

  await ensureIndicator(prisma, {
    code: 'POLITY5_SCORE',
    name: 'Polity5: Combined Polity Score',
    unit: 'score_neg10_pos10',
    topic: 'Politics',
    source: 'Center for Systemic Peace via OWID',
  });

  const entityLookup = await buildEntityLookup(prisma);
  const rows = await fetchOWIDData(POLITY_INDICATOR_ID);
  const count = await ingestRows(prisma, 'POLITY5_SCORE', 'Polity5 (CSP)', rows, entityLookup);

  console.log(`\n  Total upserted: ${count} Polity5 records`);
  console.log('\n=== Polity5 Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
