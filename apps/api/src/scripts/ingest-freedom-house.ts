/**
 * Ingest Freedom House — from OWID API
 * Full historical series: 1973-present, ~195 countries
 * Political Rights: 1-7, Civil Liberties: 1-7
 * Freedom Status derived from PR+CL average
 */

import { PrismaClient } from '@prisma/client';
import { fetchOWIDData, ensureIndicator, buildEntityLookup, ingestRows } from './lib/owid-parser';

const prisma = new PrismaClient();

// OWID indicator IDs
const PR_INDICATOR_ID = 1210106; // Political Rights Rating
const CL_INDICATOR_ID = 1210109; // Civil Liberties Score

const INDICATORS = [
  { code: 'FH_POLITICAL_RIGHTS', name: 'Freedom House: Political Rights', unit: 'score_1_7', topic: 'Politics', source: 'Freedom House via OWID' },
  { code: 'FH_CIVIL_LIBERTIES', name: 'Freedom House: Civil Liberties', unit: 'score_1_7', topic: 'Politics', source: 'Freedom House via OWID' },
  { code: 'FH_FREEDOM_STATUS', name: 'Freedom House: Freedom Status', unit: 'index', topic: 'Politics', source: 'Freedom House via OWID' },
];

async function main() {
  console.log('\n=== WorldLore: Freedom House Ingestion (OWID API — Full Historical) ===\n');

  for (const ind of INDICATORS) {
    await ensureIndicator(prisma, ind);
  }

  const entityLookup = await buildEntityLookup(prisma);

  // Political Rights
  console.log('\n  --- Political Rights ---');
  const prRows = await fetchOWIDData(PR_INDICATOR_ID);
  const prCount = await ingestRows(prisma, 'FH_POLITICAL_RIGHTS', 'Freedom House', prRows, entityLookup);
  console.log(`  Upserted ${prCount} records`);

  // Civil Liberties
  console.log('\n  --- Civil Liberties ---');
  const clRows = await fetchOWIDData(CL_INDICATOR_ID);
  const clCount = await ingestRows(prisma, 'FH_CIVIL_LIBERTIES', 'Freedom House', clRows, entityLookup);
  console.log(`  Upserted ${clCount} records`);

  // Derive Freedom Status from PR (rating 1-7) + CL (score 0-60)
  // PR rating → approx score: (8 - rating) * (40/7)
  // Total = PR_score + CL_score (0-100)
  // Free >= 71, Partly Free 36-70, Not Free <= 35
  console.log('\n  --- Deriving Freedom Status ---');
  const prMap = new Map<string, number>();
  for (const r of prRows) prMap.set(`${r.iso3}:${r.year}`, r.value);

  const statusRows = clRows
    .map(cl => {
      const prRating = prMap.get(`${cl.iso3}:${cl.year}`);
      if (prRating === undefined) return null;
      const prScore = Math.round((8 - prRating) * (40 / 7));
      const totalScore = prScore + cl.value;
      const status = totalScore >= 71 ? 3 : totalScore >= 36 ? 2 : 1;
      return { iso3: cl.iso3, year: cl.year, value: status };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const statusCount = await ingestRows(prisma, 'FH_FREEDOM_STATUS', 'Freedom House', statusRows, entityLookup);
  console.log(`  Upserted ${statusCount} Freedom Status records`);

  console.log('\n=== Freedom House Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
