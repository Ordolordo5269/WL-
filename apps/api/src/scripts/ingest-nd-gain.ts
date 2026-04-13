/**
 * Ingest ND-GAIN Country Index
 *
 * University of Notre Dame Global Adaptation Initiative
 * Measures climate vulnerability (0-1) and readiness (0-1) per country, 1995-2023.
 * Composite GAIN index is 0-100.
 *
 * Source: https://gain.nd.edu/our-work/country-index/
 * Data: ZIP with CSVs at gain.nd.edu/assets/647440/ndgain_countryindex_2026.zip
 *
 * ZIP contains (among others):
 *   - resources/gain/gain.csv            (composite 0-100)
 *   - resources/vulnerability/vulnerability.csv  (0-1)
 *   - resources/readiness/readiness.csv  (0-1)
 *
 * Each CSV: ISO3, Name, <year cols>
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const ZIP_URL = 'https://gain.nd.edu/assets/647440/ndgain_countryindex_2026.zip';

const INDICATORS = [
  { code: 'ND_GAIN_INDEX',         name: 'ND-GAIN Climate Index',          unit: 'index_0_100', topic: 'Environment' },
  { code: 'ND_GAIN_VULNERABILITY', name: 'ND-GAIN Climate Vulnerability',  unit: 'index_0_1',   topic: 'Environment' },
  { code: 'ND_GAIN_READINESS',     name: 'ND-GAIN Climate Readiness',      unit: 'index_0_1',   topic: 'Environment' },
];

// ND-GAIN uses mostly standard ISO3, but a few legacy codes need remapping
const ISO3_REMAP: Record<string, string> = {
  ROM: 'ROU', // Romania
  TMP: 'TLS', // Timor-Leste (East Timor)
  ZAR: 'COD', // DR Congo
};

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'ND-GAIN' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'ND-GAIN' },
    });
  }
  console.log(`  ${INDICATORS.length} ND-GAIN indicators ensured`);
}

/**
 * Parse a wide-format CSV with columns: ISO3, Name, 1995, 1996, ... 2023
 * Returns array of { iso3, year, value }.
 */
function parseWideCSV(csvText: string): Array<{ iso3: string; year: number; value: number }> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header: strip quotes and split by comma
  const headerCells = lines[0].split(',').map((c) => c.replace(/"/g, '').trim());
  const yearCols: Array<{ idx: number; year: number }> = [];
  for (let i = 2; i < headerCells.length; i++) {
    const y = parseInt(headerCells[i], 10);
    if (!isNaN(y) && y >= 1995 && y <= 2030) {
      yearCols.push({ idx: i, year: y });
    }
  }

  const results: Array<{ iso3: string; year: number; value: number }> = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split — these files have no embedded commas
    const cells = lines[i].split(',').map((c) => c.replace(/"/g, '').trim());
    if (cells.length < 3) continue;

    let iso3 = cells[0].toUpperCase();
    iso3 = ISO3_REMAP[iso3] || iso3;
    if (iso3.length !== 3) continue;

    for (const { idx, year } of yearCols) {
      const raw = cells[idx];
      if (!raw || raw === 'NA') continue;
      const v = parseFloat(raw);
      if (!isFinite(v)) continue;
      results.push({ iso3, year, value: v });
    }
  }

  return results;
}

async function main() {
  console.log('\n=== WorldLore: ND-GAIN Ingestion ===\n');

  await ensureIndicators();

  // Download ZIP
  console.log(`  Downloading ND-GAIN ZIP from gain.nd.edu...`);
  const { data: zipBuffer } = await axios.get<ArrayBuffer>(ZIP_URL, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });
  console.log(`  Downloaded ${(zipBuffer.byteLength / 1024).toFixed(0)} KB`);

  const zip = new AdmZip(Buffer.from(zipBuffer));

  const readCSV = (path: string): string => {
    const entry = zip.getEntry(path);
    if (!entry) throw new Error(`ZIP entry not found: ${path}`);
    return entry.getData().toString('utf8');
  };

  const gainText = readCSV('resources/gain/gain.csv');
  const vulnText = readCSV('resources/vulnerability/vulnerability.csv');
  const readyText = readCSV('resources/readiness/readiness.csv');

  const gainRows = parseWideCSV(gainText);
  const vulnRows = parseWideCSV(vulnText);
  const readyRows = parseWideCSV(readyText);
  console.log(`  Parsed: gain=${gainRows.length}, vulnerability=${vulnRows.length}, readiness=${readyRows.length}`);

  // Build entity lookup
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded`);

  // Build upsert rows per indicator
  const buildUpserts = (rows: Array<{ iso3: string; year: number; value: number }>, indicatorCode: string) => {
    const out: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
    let matched = 0;
    for (const r of rows) {
      const entityId = iso3ToEntityId[r.iso3];
      if (!entityId) continue;
      matched++;
      out.push({ id: randomUUID(), entityId, indicatorCode, year: r.year, value: r.value, source: 'ND-GAIN', meta: null });
    }
    return { rows: out, matched };
  };

  const datasets: Array<[string, Array<{ iso3: string; year: number; value: number }>]> = [
    ['ND_GAIN_INDEX', gainRows],
    ['ND_GAIN_VULNERABILITY', vulnRows],
    ['ND_GAIN_READINESS', readyRows],
  ];

  let total = 0;
  for (const [code, rows] of datasets) {
    const { rows: upsertRows, matched } = buildUpserts(rows, code);
    console.log(`\n  ${code}: matched ${matched}/${rows.length} rows`);
    if (upsertRows.length > 0) {
      await bulkUpsertIndicatorValues(prisma, upsertRows);
      console.log(`  Upserted ${upsertRows.length} records`);
      total += upsertRows.length;
    }
  }

  console.log(`\n  Total ND-GAIN values upserted: ${total}`);
  console.log('\n=== ND-GAIN Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
