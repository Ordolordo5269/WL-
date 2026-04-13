/**
 * Ingest FAOSTAT Crop Production — via OWID mirror (public, no API key)
 *
 * P3 Fase A · Paso A4
 *
 * Source: FAO FAOSTAT (Food and Agriculture Organization)
 * Mirror: ourworldindata.org/grapher/{crop}-production.csv
 *
 * Crop-specific production (tonnes) replacing generic CEREAL_PRODUCTION_MT.
 * Enables ML and UI to distinguish "wheat exporter" vs "rice exporter" —
 * critical for food security analysis (e.g., Ukraine wheat shock, Argentina
 * soybean, Vietnam rice).
 *
 * Coverage: ~200 countries × 1961-2024 (64 years) × 5 crops.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

interface CropSpec {
  code: string;
  name: string;
  slug: string; // OWID grapher slug
}

const CROPS: CropSpec[] = [
  { code: 'WHEAT_PROD_T',   name: 'Wheat Production',   slug: 'wheat-production' },
  { code: 'MAIZE_PROD_T',   name: 'Maize Production',   slug: 'maize-production' },
  { code: 'RICE_PROD_T',    name: 'Rice Production',    slug: 'rice-production' },
  { code: 'SOYBEAN_PROD_T', name: 'Soybean Production', slug: 'soybean-production' },
  { code: 'BARLEY_PROD_T',  name: 'Barley Production',  slug: 'barley-production' },
];

async function ensureIndicators() {
  for (const c of CROPS) {
    await prisma.indicator.upsert({
      where: { code: c.code },
      create: { code: c.code, name: c.name, topic: 'Raw Materials', unit: 'tonnes', source: 'FAO via OWID' },
      update: { name: c.name, topic: 'Raw Materials', unit: 'tonnes', source: 'FAO via OWID' },
    });
  }
  console.log(`  ${CROPS.length} FAOSTAT crop indicators ensured`);
}

/**
 * Parse OWID grapher CSV (Entity, Code, Year, Value).
 * Returns rows with valid ISO3 + numeric value.
 */
function parseGrapherCSV(csvText: string): Array<{ iso3: string; year: number; value: number }> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const out: Array<{ iso3: string; year: number; value: number }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    if (cells.length < 4) continue;

    const iso3 = (cells[1] || '').toUpperCase();
    if (!iso3 || iso3.length !== 3) continue; // skip aggregates like "Africa", "World"

    const year = parseInt(cells[2], 10);
    if (isNaN(year) || year < 1900 || year > 2030) continue;

    const raw = cells[3];
    if (!raw || raw === '' || raw === 'NA') continue;

    const value = parseFloat(raw);
    if (!isFinite(value)) continue;

    out.push({ iso3, year, value });
  }

  return out;
}

async function main() {
  console.log('\n=== WorldLore: FAOSTAT Crops Ingestion (P3 A4) ===\n');

  await ensureIndicators();

  // Build entity lookup
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded\n`);

  let total = 0;
  const stats: Record<string, number> = {};

  for (const crop of CROPS) {
    const url = `https://ourworldindata.org/grapher/${crop.slug}.csv`;
    console.log(`  Fetching ${crop.code} from OWID (${crop.slug})...`);

    const { data: csvText } = await axios.get<string>(url, {
      timeout: 60000,
      responseType: 'text',
      transformResponse: [(d) => d],
    });

    const rows = parseGrapherCSV(csvText);

    const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
    let matched = 0;

    for (const row of rows) {
      const entityId = iso3ToEntityId[row.iso3];
      if (!entityId) continue;
      matched++;
      upsertRows.push({
        id: randomUUID(),
        entityId,
        indicatorCode: crop.code,
        year: row.year,
        value: row.value,
        source: 'FAO via OWID',
        meta: null,
      });
    }

    console.log(`    matched ${matched}/${rows.length} rows`);

    if (upsertRows.length > 0) {
      await bulkUpsertIndicatorValues(prisma, upsertRows);
      stats[crop.code] = upsertRows.length;
      total += upsertRows.length;
    }
  }

  console.log(`\n  Upserts per crop:`);
  for (const [code, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(18)} ${count.toString().padStart(7)}`);
  }
  console.log(`\n  Total crop records upserted: ${total}`);
  console.log('\n=== FAOSTAT Crops Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
