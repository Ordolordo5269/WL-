/**
 * Ingest Global Carbon Project — Fuel-specific CO2 emissions
 *
 * Source: Global Carbon Budget 2024 (Friedlingstein et al.)
 * Via: OWID's maintained mirror at github.com/owid/co2-data
 *
 * Provides annual CO2 emissions by source (coal, oil, gas, cement, flaring) and
 * consumption-based CO2 (adjusted for imports/exports).
 *
 * Units: Million tonnes CO2 (Mt CO2). We filter to 1960+ to align with World Bank baseline.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const CSV_URL = 'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv';

const INDICATORS = [
  { code: 'CO2_COAL_MT',        name: 'CO₂ Emissions from Coal',        unit: 'MtCO2', topic: 'Environment' },
  { code: 'CO2_OIL_MT',         name: 'CO₂ Emissions from Oil',         unit: 'MtCO2', topic: 'Environment' },
  { code: 'CO2_GAS_MT',         name: 'CO₂ Emissions from Gas',         unit: 'MtCO2', topic: 'Environment' },
  { code: 'CO2_CEMENT_MT',      name: 'CO₂ Emissions from Cement',      unit: 'MtCO2', topic: 'Environment' },
  { code: 'CO2_FLARING_MT',     name: 'CO₂ Emissions from Flaring',     unit: 'MtCO2', topic: 'Environment' },
  { code: 'CO2_CONSUMPTION_MT', name: 'CO₂ Emissions (Consumption-based)', unit: 'MtCO2', topic: 'Environment' },
];

// CSV column → indicator code
const COL_TO_CODE: Record<string, string> = {
  coal_co2: 'CO2_COAL_MT',
  oil_co2: 'CO2_OIL_MT',
  gas_co2: 'CO2_GAS_MT',
  cement_co2: 'CO2_CEMENT_MT',
  flaring_co2: 'CO2_FLARING_MT',
  consumption_co2: 'CO2_CONSUMPTION_MT',
};

// OWID aggregate rows that are NOT countries
const NON_COUNTRY_NAMES = new Set([
  'World', 'Europe', 'Europe (GCP)', 'European Union (27)', 'European Union (28)',
  'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica',
  'Asia (GCP)', 'Africa (GCP)', 'North America (GCP)', 'South America (GCP)',
  'High-income countries', 'Low-income countries', 'Lower-middle-income countries',
  'Upper-middle-income countries', 'OECD (GCP)', 'Non-OECD (GCP)',
  'International aviation', 'International shipping', 'International transport',
]);

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'Global Carbon Project' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'Global Carbon Project' },
    });
  }
  console.log(`  ${INDICATORS.length} GCP indicators ensured`);
}

/**
 * Parse OWID CSV (comma-separated, header row, well-formed).
 * Returns array of row objects keyed by column name.
 */
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cells = line.split(',');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j] || '';
    }
    rows.push(row);
  }
  return rows;
}

async function main() {
  console.log('\n=== WorldLore: Global Carbon Project Ingestion ===\n');

  await ensureIndicators();

  console.log(`  Fetching OWID CO2 dataset from github.com/owid/co2-data...`);
  const { data: csvText } = await axios.get<string>(CSV_URL, {
    timeout: 90000,
    responseType: 'text',
    transformResponse: [(d) => d], // prevent axios from parsing as JSON
  });
  console.log(`  Downloaded ${(csvText.length / 1024 / 1024).toFixed(1)} MB`);

  const rows = parseCSV(csvText);
  console.log(`  Parsed ${rows.length} CSV rows`);

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

  for (const row of rows) {
    const country = row.country;
    const iso = (row.iso_code || '').toUpperCase();
    const year = parseInt(row.year, 10);

    // Filter: real countries only, year 1960+, has ISO3
    if (NON_COUNTRY_NAMES.has(country)) continue;
    if (!iso || iso.length !== 3) continue;
    if (isNaN(year) || year < 1960 || year > 2030) continue;

    const entityId = iso3ToEntityId[iso];
    if (!entityId) continue;

    for (const [col, code] of Object.entries(COL_TO_CODE)) {
      const raw = row[col];
      if (!raw || raw === '') continue;
      const v = parseFloat(raw);
      if (!isFinite(v)) continue;

      upsertRows.push({
        id: randomUUID(),
        entityId,
        indicatorCode: code,
        year,
        value: v,
        source: 'Global Carbon Project',
        meta: null,
      });
      stats[code] = (stats[code] || 0) + 1;
    }
  }

  console.log(`\n  Built upserts per indicator:`);
  for (const [code, count] of Object.entries(stats)) {
    console.log(`    ${code}: ${count}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} total rows...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Done.`);
  }

  console.log('\n=== GCP Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
