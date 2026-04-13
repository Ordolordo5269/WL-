/**
 * Ingest Global Forest Watch — Annual tree cover loss by country
 *
 * Source: Hansen/UMD (University of Maryland) via GFW
 * Mirror: Our World in Data (public, no API key needed)
 *
 * OWID publishes the country-level annual aggregation of Hansen's tree cover loss
 * raster data. This is the same data the GFW dashboard uses, pre-aggregated.
 *
 * Coverage: ~200 countries × 2001-2024 (24 years)
 * Unit: hectares
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const CSV_URL = 'https://ourworldindata.org/grapher/tree-cover-loss.csv';

const INDICATORS = [
  { code: 'FOREST_LOSS_HA', name: 'Annual Tree Cover Loss', unit: 'hectares', topic: 'Environment' },
];

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'Global Forest Watch / UMD' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'Global Forest Watch / UMD' },
    });
  }
  console.log(`  ${INDICATORS.length} GFW indicators ensured`);
}

async function main() {
  console.log('\n=== WorldLore: Global Forest Watch Ingestion ===\n');

  await ensureIndicators();

  console.log(`  Downloading tree cover loss CSV from OWID (Hansen/UMD mirror)...`);
  const { data: csvText } = await axios.get<string>(CSV_URL, {
    timeout: 60000,
    responseType: 'text',
    transformResponse: [(d) => d],
  });
  console.log(`  Downloaded ${(csvText.length / 1024).toFixed(0)} KB`);

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  console.log(`  Parsed ${lines.length - 1} data rows`);

  // Build entity lookup
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded`);

  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  let matched = 0;
  let skippedAggregates = 0;
  let skippedNoEntity = 0;

  // CSV header: Entity, Code, Year, Total
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    if (cells.length < 4) continue;

    const iso3 = (cells[1] || '').toUpperCase();
    const year = parseInt(cells[2], 10);
    const valueRaw = cells[3];

    // Skip aggregate rows (Africa, World, etc. have no ISO3)
    if (!iso3 || iso3.length !== 3) {
      skippedAggregates++;
      continue;
    }

    if (isNaN(year) || year < 2000 || year > 2030) continue;
    if (!valueRaw || valueRaw === '' || valueRaw === 'NA') continue;

    const value = parseFloat(valueRaw);
    if (!isFinite(value)) continue;

    const entityId = iso3ToEntityId[iso3];
    if (!entityId) {
      skippedNoEntity++;
      continue;
    }

    matched++;
    upsertRows.push({
      id: randomUUID(),
      entityId,
      indicatorCode: 'FOREST_LOSS_HA',
      year,
      value,
      source: 'Global Forest Watch / UMD',
      meta: null,
    });
  }

  console.log(`\n  Matched: ${matched} rows`);
  if (skippedAggregates > 0) console.log(`  Skipped aggregates (no ISO3): ${skippedAggregates}`);
  if (skippedNoEntity > 0) console.log(`  Skipped (entity not found): ${skippedNoEntity}`);

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} records...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Done.`);
  }

  console.log('\n=== GFW Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
