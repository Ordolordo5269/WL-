/**
 * Ingest OWID Energy Data — country-level energy production, electricity
 * generation by source, and share-of-mix indicators.
 *
 * Source: Our World in Data's consolidated energy dataset.
 * Upstream: Energy Institute Statistical Review of World Energy + EIA + Ember.
 *
 * URL: https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv
 *
 * Coverage: ~200 countries × up to 1900-2024 (realistic ~80-100K rows after null filter).
 *
 * Three groups of indicators (intentionally separated — see DECISIONS.md):
 *   1. Primary production (oil/gas/coal extracted in TWh-equivalent).
 *   2. Electricity generation by source (TWh produced in the grid).
 *   3. Electricity mix shares (% renewables / % fossils).
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const CSV_URL = 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv';

const INDICATORS = [
  // Primary production (TWh-equivalent)
  { code: 'OIL_PROD_TWH',         name: 'Oil Production',         unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'GAS_PROD_TWH',         name: 'Gas Production',         unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'COAL_PROD_TWH',        name: 'Coal Production',        unit: 'TWh',         topic: 'Raw Materials' },
  // Electricity generation by source (TWh)
  { code: 'ELEC_GEN_TOTAL_TWH',   name: 'Total Electricity Generation', unit: 'TWh',   topic: 'Raw Materials' },
  { code: 'NUCLEAR_GEN_TWH',      name: 'Nuclear Electricity',    unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'SOLAR_GEN_TWH',        name: 'Solar Electricity',      unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'WIND_GEN_TWH',         name: 'Wind Electricity',       unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'HYDRO_GEN_TWH',        name: 'Hydro Electricity',      unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'COAL_GEN_TWH',         name: 'Coal Electricity',       unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'GAS_GEN_TWH',          name: 'Gas Electricity',        unit: 'TWh',         topic: 'Raw Materials' },
  { code: 'OIL_GEN_TWH',          name: 'Oil Electricity',        unit: 'TWh',         topic: 'Raw Materials' },
  // Mix shares (%)
  { code: 'RENEWABLES_SHARE_PCT', name: 'Renewables Share of Electricity', unit: 'percent', topic: 'Raw Materials' },
  { code: 'FOSSIL_SHARE_PCT',     name: 'Fossil Share of Electricity',     unit: 'percent', topic: 'Raw Materials' },
];

// CSV column → indicator code map
const COL_TO_CODE: Record<string, string> = {
  oil_production: 'OIL_PROD_TWH',
  gas_production: 'GAS_PROD_TWH',
  coal_production: 'COAL_PROD_TWH',
  electricity_generation: 'ELEC_GEN_TOTAL_TWH',
  nuclear_electricity: 'NUCLEAR_GEN_TWH',
  solar_electricity: 'SOLAR_GEN_TWH',
  wind_electricity: 'WIND_GEN_TWH',
  hydro_electricity: 'HYDRO_GEN_TWH',
  coal_electricity: 'COAL_GEN_TWH',
  gas_electricity: 'GAS_GEN_TWH',
  oil_electricity: 'OIL_GEN_TWH',
  renewables_share_elec: 'RENEWABLES_SHARE_PCT',
  fossil_share_elec: 'FOSSIL_SHARE_PCT',
};

// OWID aggregate rows that must be filtered out (not real countries)
const NON_COUNTRY_NAMES = new Set([
  'World', 'Europe', 'Europe (Ember)', 'European Union (27)', 'European Union (28)',
  'Asia', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica',
  'Asia Pacific', 'CIS', 'Middle East',
  'Asia (Ember)', 'Africa (Ember)', 'North America (Ember)', 'South America (Ember)',
  'Asia Pacific (Ember)', 'Latin America and Caribbean (Ember)',
  'High-income countries', 'Low-income countries', 'Lower-middle-income countries',
  'Upper-middle-income countries', 'OECD (EI)', 'Non-OECD (EI)',
  'OECD (Ember)', 'Non-OECD (Ember)', 'G7 (Ember)', 'G20 (Ember)',
  'International aviation', 'International shipping', 'International transport',
]);

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'OWID Energy Data' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'OWID Energy Data' },
    });
  }
  console.log(`  ${INDICATORS.length} OWID Energy indicators ensured`);
}

/**
 * Parse a simple CSV (no embedded commas in values for this dataset).
 * Returns array of objects keyed by header name.
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
  console.log('\n=== WorldLore: OWID Energy Data Ingestion (P3 A1) ===\n');

  await ensureIndicators();

  console.log(`  Fetching OWID energy CSV from github.com/owid/energy-data...`);
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

    if (NON_COUNTRY_NAMES.has(country)) continue;
    if (!iso || iso.length !== 3) continue;
    if (isNaN(year) || year < 1900 || year > 2030) continue;

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
        source: 'OWID Energy Data',
        meta: null,
      });
      stats[code] = (stats[code] || 0) + 1;
    }
  }

  console.log(`\n  Built upserts per indicator:`);
  for (const [code, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(22)} ${count.toString().padStart(7)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} total rows...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Done.`);
  }

  console.log('\n=== OWID Energy Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
