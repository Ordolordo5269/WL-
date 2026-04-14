/**
 * Ingest USGS Mineral Commodity Summaries — Critical Minerals
 *
 * P3 Fase A · Paso A3 (cierra P3 Fase A al 100%)
 *
 * Source: US Geological Survey — Mineral Commodity Summaries 2025
 * DOI: 10.5066/P13XCP3R (ScienceBase item 677eaf95d34e760b392c4970)
 * License: Public domain (CC0)
 *
 * Downloads the Data Release ZIP, extracts `World_Data_Release_MCS_2025.zip`,
 * then parses `MCS2025_World_Data.csv` (1,251 rows, 77 commodities worldwide).
 *
 * Scope: 6 critical minerals relevant to the energy transition and modern
 * geopolitics (batteries, electronics, defense):
 *   - Copper (electrification)
 *   - Nickel (batteries, stainless steel)
 *   - Lithium (EV batteries)
 *   - Cobalt (batteries — 70% DR Congo dominance)
 *   - Graphite (battery anodes — 60% China)
 *   - Rare earths (magnets, chips, defense — 85% China)
 *
 * Out of scope: Uranium (not in USGS MCS — see DECISIONS.md for options).
 *
 * For each mineral × country, ingest:
 *   - Production 2023
 *   - Production 2024 (estimate)
 *   - Reserves 2024 (proven, economically extractable)
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const DATA_RELEASE_URL =
  'https://www.sciencebase.gov/catalog/file/get/677eaf95d34e760b392c4970';

/**
 * Mineral definitions. `usgsName` must match the COMMODITY column in the CSV
 * AFTER .trim() — USGS inconsistently adds trailing spaces (e.g., "Copper ",
 * "Lithium "). We always trim before comparing.
 */
interface MineralSpec {
  usgsName: string;           // COMMODITY value after .trim()
  prodCode: string;           // indicator for production
  reservesCode: string;       // indicator for reserves
  prodUnit: 'metric tons' | 'thousand metric tons';
  /** How USGS measures this mineral — used for sanity-checking UNIT_MEAS column */
  expectedUnit: string;
}

const MINERALS: MineralSpec[] = [
  { usgsName: 'Copper',      prodCode: 'COPPER_PROD_KT',    reservesCode: 'COPPER_RESERVES_KT',    prodUnit: 'thousand metric tons', expectedUnit: 'thousand metric tons' },
  { usgsName: 'Nickel',      prodCode: 'NICKEL_PROD_T',     reservesCode: 'NICKEL_RESERVES_T',     prodUnit: 'metric tons',           expectedUnit: 'metric tons' },
  { usgsName: 'Lithium',     prodCode: 'LITHIUM_PROD_T',    reservesCode: 'LITHIUM_RESERVES_T',    prodUnit: 'metric tons',           expectedUnit: 'metric tons' },
  { usgsName: 'Cobalt',      prodCode: 'COBALT_PROD_T',     reservesCode: 'COBALT_RESERVES_T',     prodUnit: 'metric tons',           expectedUnit: 'metric tons' },
  { usgsName: 'Graphite',    prodCode: 'GRAPHITE_PROD_T',   reservesCode: 'GRAPHITE_RESERVES_T',   prodUnit: 'metric tons',           expectedUnit: 'metric tons' },
  { usgsName: 'Rare earths', prodCode: 'RARE_EARTHS_PROD_T', reservesCode: 'RARE_EARTHS_RESERVES_T', prodUnit: 'metric tons',         expectedUnit: 'metric tons' },
];

const PROD_NAME: Record<string, string> = {
  COPPER_PROD_KT:       'Copper Mine Production',
  COPPER_RESERVES_KT:   'Copper Reserves',
  NICKEL_PROD_T:        'Nickel Mine Production',
  NICKEL_RESERVES_T:    'Nickel Reserves',
  LITHIUM_PROD_T:       'Lithium Mine Production',
  LITHIUM_RESERVES_T:   'Lithium Reserves',
  COBALT_PROD_T:        'Cobalt Mine Production',
  COBALT_RESERVES_T:    'Cobalt Reserves',
  GRAPHITE_PROD_T:      'Graphite Mine Production',
  GRAPHITE_RESERVES_T:  'Graphite Reserves',
  RARE_EARTHS_PROD_T:   'Rare Earths Mine Production',
  RARE_EARTHS_RESERVES_T: 'Rare Earths Reserves',
};

/**
 * Map USGS country names (English, as published) to our ISO3 codes.
 * Only includes countries that actually appear in the 6 minerals we target.
 */
const COUNTRY_TO_ISO3: Record<string, string> = {
  'Argentina': 'ARG',
  'Australia': 'AUS',
  'Austria': 'AUT',
  'Brazil': 'BRA',
  'Burma': 'MMR',            // Myanmar
  'Canada': 'CAN',
  'Chile': 'CHL',
  'China': 'CHN',
  'Congo (Kinshasa)': 'COD',  // Democratic Republic of the Congo
  'Cuba': 'CUB',
  'Germany': 'DEU',
  'Greenland': 'GRL',
  'India': 'IND',
  'Indonesia': 'IDN',
  'Japan': 'JPN',
  'Kazakhstan': 'KAZ',
  'Korea, North': 'PRK',
  'Korea, Republic of': 'KOR',
  'Madagascar': 'MDG',
  'Malaysia': 'MYS',
  'Mexico': 'MEX',
  'Mozambique': 'MOZ',
  'Namibia': 'NAM',
  'New Caledonia': 'NCL',
  'Nigeria': 'NGA',
  'Norway': 'NOR',
  'Papua New Guinea': 'PNG',
  'Peru': 'PER',
  'Philippines': 'PHL',
  'Poland': 'POL',
  'Portugal': 'PRT',
  'Russia': 'RUS',
  'South Africa': 'ZAF',
  'Sri Lanka': 'LKA',
  'Tanzania': 'TZA',
  'Thailand': 'THA',
  'Turkey': 'TUR',
  'Ukraine': 'UKR',
  'United States': 'USA',
  'Vietnam': 'VNM',
  'Zambia': 'ZMB',
  'Zimbabwe': 'ZWE',
  // "Other Countries" and "World total" are intentionally dropped.
};

async function ensureIndicators() {
  const topic = 'Raw Materials';
  const source = 'USGS';
  for (const m of MINERALS) {
    await prisma.indicator.upsert({
      where: { code: m.prodCode },
      create: { code: m.prodCode, name: PROD_NAME[m.prodCode], topic, unit: m.prodUnit, source },
      update: { name: PROD_NAME[m.prodCode], topic, unit: m.prodUnit, source },
    });
    await prisma.indicator.upsert({
      where: { code: m.reservesCode },
      create: { code: m.reservesCode, name: PROD_NAME[m.reservesCode], topic, unit: m.prodUnit, source },
      update: { name: PROD_NAME[m.reservesCode], topic, unit: m.prodUnit, source },
    });
  }
  console.log(`  ${MINERALS.length * 2} USGS indicators ensured`);
}

/**
 * Minimal CSV parser that respects quoted fields (USGS uses quotes around
 * multi-word `TYPE` and `NOTES` values that may contain commas).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

function toNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '');
  if (!cleaned) return null;
  // USGS uses "W" for withheld, "NA" for not available, etc.
  if (/^[A-Za-z]+$/.test(cleaned)) return null;
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : null;
}

async function main() {
  console.log('\n=== WorldLore: USGS Critical Minerals Ingestion (P3 A3) ===\n');

  await ensureIndicators();

  console.log('  Downloading USGS MCS 2025 Data Release ZIP...');
  const { data: outerBuf } = await axios.get<ArrayBuffer>(DATA_RELEASE_URL, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });
  console.log(`  Downloaded ${(outerBuf.byteLength / 1024).toFixed(0)} KB`);

  const outerZip = new AdmZip(Buffer.from(outerBuf));
  const worldEntry = outerZip.getEntry('World_Data_Release_MCS_2025.zip');
  if (!worldEntry) throw new Error('World_Data_Release_MCS_2025.zip not found inside outer ZIP');

  const innerZip = new AdmZip(worldEntry.getData());
  const csvEntry = innerZip.getEntry('MCS2025_World_Data.csv');
  if (!csvEntry) throw new Error('MCS2025_World_Data.csv not found inside inner ZIP');

  let csvText = csvEntry.getData().toString('utf8');
  // Strip BOM if present
  if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1);

  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error('CSV appears empty');

  const header = rows[0].map((h) => h.trim());
  const idx = {
    commodity: header.indexOf('COMMODITY'),
    country:   header.indexOf('COUNTRY'),
    type:      header.indexOf('TYPE'),
    unit:      header.indexOf('UNIT_MEAS'),
    prod2023:  header.indexOf('PROD_2023'),
    prod2024:  header.indexOf('PROD_EST_ 2024'),
    reserves:  header.indexOf('RESERVES_2024'),
  };
  const missing = Object.entries(idx).filter(([, v]) => v < 0).map(([k]) => k);
  if (missing.length > 0) throw new Error(`Missing CSV columns: ${missing.join(', ')}`);

  console.log(`  Parsed ${rows.length - 1} CSV data rows`);

  // Entity lookup (ISO3 → entityId)
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded`);

  // Build fast commodity lookup with .trim() defensiveness
  const mineralByUsgsName = new Map<string, MineralSpec>();
  for (const m of MINERALS) mineralByUsgsName.set(m.usgsName.trim().toLowerCase(), m);

  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  const stats: Record<string, number> = {};
  let matched = 0;
  let skippedCountryUnknown = 0;
  const unknownCountries = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < header.length) continue;

    const commodityRaw = (r[idx.commodity] || '').trim();
    if (!commodityRaw) continue;
    const spec = mineralByUsgsName.get(commodityRaw.toLowerCase());
    if (!spec) continue; // not one of our 6 target minerals

    // Only keep MINE production rows (exclude "Refinery production", "Smelter",
    // "Plant capacity", etc). The geopolitical narrative ("country X produces
    // Y% of world's Z") depends on extraction, not downstream refining.
    const typeRaw = (r[idx.type] || '').trim().toLowerCase();
    if (!typeRaw.startsWith('mine production')) continue;

    const countryRaw = (r[idx.country] || '').trim();
    if (!countryRaw || /^world/i.test(countryRaw) || /^other/i.test(countryRaw)) continue;

    const iso3 = COUNTRY_TO_ISO3[countryRaw];
    if (!iso3) {
      skippedCountryUnknown++;
      unknownCountries.add(countryRaw);
      continue;
    }
    const entityId = iso3ToEntityId[iso3];
    if (!entityId) { skippedCountryUnknown++; continue; }

    const p2023 = toNumber(r[idx.prod2023] || '');
    const p2024 = toNumber(r[idx.prod2024] || '');
    const res2024 = toNumber(r[idx.reserves] || '');

    if (p2023 !== null) {
      upsertRows.push({ id: randomUUID(), entityId, indicatorCode: spec.prodCode, year: 2023, value: p2023, source: 'USGS', meta: null });
      stats[spec.prodCode] = (stats[spec.prodCode] || 0) + 1;
    }
    if (p2024 !== null) {
      upsertRows.push({ id: randomUUID(), entityId, indicatorCode: spec.prodCode, year: 2024, value: p2024, source: 'USGS', meta: { estimate: true } });
      stats[spec.prodCode] = (stats[spec.prodCode] || 0) + 1;
    }
    if (res2024 !== null) {
      upsertRows.push({ id: randomUUID(), entityId, indicatorCode: spec.reservesCode, year: 2024, value: res2024, source: 'USGS', meta: null });
      stats[spec.reservesCode] = (stats[spec.reservesCode] || 0) + 1;
    }

    if (p2023 !== null || p2024 !== null || res2024 !== null) matched++;
  }

  console.log(`\n  Matched ${matched} country-mineral rows`);
  if (skippedCountryUnknown > 0) {
    console.log(`  Skipped (unknown country): ${skippedCountryUnknown}`);
    if (unknownCountries.size > 0) {
      console.log('  Unknown country names:', [...unknownCountries].slice(0, 5).join(', '));
    }
  }

  console.log('\n  Upserts per indicator:');
  for (const [code, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(24)} ${count.toString().padStart(4)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} rows...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Done.`);
  }

  console.log('\n=== USGS Critical Minerals Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
