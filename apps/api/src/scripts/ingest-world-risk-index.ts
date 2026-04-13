/**
 * Ingest World Risk Index (WRI) — Bündnis Entwicklung Hilft / IFHV
 *
 * Annual composite index of natural hazard risk combining:
 *   - E: Exposure to natural hazards
 *   - V: Vulnerability
 *   - S: Susceptibility
 *   - C: Lack of coping capacity
 *   - A: Lack of adaptive capacity
 *   - W: World Risk Index (composite, scale 0-100 as %)
 *
 * Source: https://weltrisikobericht.de/weltrisikobericht-2025/
 * File: WorldRiskIndex-trend.csv — 193 countries × 2000-2025 (~5000 rows)
 * License: CC BY 4.0
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const CSV_URL = 'https://weltrisikobericht.de/download/4566/';

const INDICATORS = [
  { code: 'WRI_SCORE',         name: 'World Risk Index (Score)',       unit: 'score_0_100', topic: 'Environment' },
  { code: 'WRI_EXPOSURE',      name: 'World Risk Index (Exposure)',    unit: 'score_0_100', topic: 'Environment' },
  { code: 'WRI_VULNERABILITY', name: 'World Risk Index (Vulnerability)', unit: 'score_0_100', topic: 'Environment' },
];

// CSV column index (0-based) → indicator code
// Columns in the trend CSV: WRI.Country, ISO3.Code, Year, W, E, V, S, C, A, ...
const COL_TO_CODE: Array<{ idx: number; code: string }> = [
  { idx: 3, code: 'WRI_SCORE' },          // W
  { idx: 4, code: 'WRI_EXPOSURE' },       // E
  { idx: 5, code: 'WRI_VULNERABILITY' },  // V
];

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'Bündnis Entwicklung Hilft' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'Bündnis Entwicklung Hilft' },
    });
  }
  console.log(`  ${INDICATORS.length} WRI indicators ensured`);
}

/**
 * Parse CSV where string cells are quoted (e.g. "Afghanistan") but numbers are not.
 * Strip quotes from each cell and split by comma.
 */
function parseCSVRow(line: string): string[] {
  return line.split(',').map((c) => c.replace(/^"(.*)"$/, '$1').trim());
}

async function main() {
  console.log('\n=== WorldLore: World Risk Index Ingestion (WRI 2025) ===\n');

  await ensureIndicators();

  console.log(`  Downloading WRI CSV from weltrisikobericht.de...`);
  const { data: csvText } = await axios.get<string>(CSV_URL, {
    timeout: 60000,
    responseType: 'text',
    transformResponse: [(d) => d],
  });
  console.log(`  Downloaded ${(csvText.length / 1024 / 1024).toFixed(1)} MB`);

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
  const stats: Record<string, number> = {};
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i]);
    if (cells.length < 6) continue;

    const iso3 = cells[1].toUpperCase();
    const year = parseInt(cells[2], 10);

    if (iso3.length !== 3) continue;
    if (isNaN(year) || year < 2000 || year > 2030) continue;

    const entityId = iso3ToEntityId[iso3];
    if (!entityId) {
      skipped++;
      continue;
    }

    for (const { idx, code } of COL_TO_CODE) {
      const raw = cells[idx];
      if (!raw || raw === 'NA') continue;
      const v = parseFloat(raw);
      if (!isFinite(v)) continue;

      upsertRows.push({
        id: randomUUID(),
        entityId,
        indicatorCode: code,
        year,
        value: v,
        source: 'Bündnis Entwicklung Hilft',
        meta: null,
      });
      stats[code] = (stats[code] || 0) + 1;
    }
  }

  console.log(`\n  Built upserts per indicator:`);
  for (const [code, count] of Object.entries(stats)) {
    console.log(`    ${code}: ${count}`);
  }
  if (skipped > 0) console.log(`  ${skipped} rows skipped (entity not found)`);

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} total rows...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Done.`);
  }

  console.log('\n=== WRI Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
