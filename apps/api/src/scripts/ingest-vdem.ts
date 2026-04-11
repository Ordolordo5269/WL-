/**
 * Ingest V-Dem Democracy Indices — from OWID API
 * Full historical series: 1789-present, ~180 countries, scale 0-1
 *
 * Uses 8 V-Dem indices available via OWID API.
 * Covers: Electoral, Liberal, Participatory, Freedom of Expression, Rule of Law,
 * Deliberative, Egalitarian, and Clean Elections democracy indices.
 */

import { PrismaClient } from '@prisma/client';
import { fetchOWIDData, ensureIndicator, buildEntityLookup, ingestRows } from './lib/owid-parser';

const prisma = new PrismaClient();

// [indicatorCode, displayName, OWID indicator ID]
const VDEM_INDICATORS: Array<[string, string, number]> = [
  ['VDEM_POLYARCHY', 'V-Dem: Electoral Democracy Index', 1209753],
  ['VDEM_LIBDEM', 'V-Dem: Liberal Democracy Index', 1209797],
  ['VDEM_PARTIPDEM', 'V-Dem: Participatory Democracy Index', 1209806],
  ['VDEM_FREEXP', 'V-Dem: Freedom of Expression', 1209774],
  ['VDEM_RULE_OF_LAW', 'V-Dem: Rule of Law Index', 1209827],
  ['VDEM_DELIBDEM', 'V-Dem: Deliberative Democracy Index', 1209740],
  ['VDEM_EGALDEM', 'V-Dem: Egalitarian Democracy Index', 1209749],
  ['VDEM_CLEAN_ELECTIONS', 'V-Dem: Clean Elections Index', 1209755],
];

async function main() {
  console.log('\n=== WorldLore: V-Dem Ingestion (OWID API — Full Historical) ===\n');

  for (const [code, name] of VDEM_INDICATORS) {
    await ensureIndicator(prisma, { code, name, unit: 'index_0_1', topic: 'Politics', source: 'V-Dem Institute via OWID' });
  }
  console.log(`  ${VDEM_INDICATORS.length} V-Dem indicators ensured\n`);

  const entityLookup = await buildEntityLookup(prisma);
  let totalUpserted = 0;

  for (const [code, name, owidId] of VDEM_INDICATORS) {
    console.log(`\n  --- ${name} ---`);
    try {
      const rows = await fetchOWIDData(owidId);
      const count = await ingestRows(prisma, code, 'V-Dem Institute', rows, entityLookup);
      console.log(`  Upserted ${count} records`);
      totalUpserted += count;
    } catch (err) {
      console.log(`  ERROR: ${(err as Error).message.substring(0, 80)}`);
    }
  }

  console.log(`\n  Total V-Dem records upserted: ${totalUpserted}`);
  console.log('\n=== V-Dem Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
