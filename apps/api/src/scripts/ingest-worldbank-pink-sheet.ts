/**
 * Ingest World Bank Commodity Markets "Pink Sheet" — monthly prices
 *
 * P3 Fase B (closes P3 Energy & Commodities).
 *
 * Source: World Bank Commodity Markets
 * Landing: https://www.worldbank.org/en/research/commodity-markets
 * XLSX:    https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx
 * License: CC-BY 4.0 (free, attribution)
 *
 * Why this phase: P3 Fase A captured physical supply (extraction, production,
 * consumption). Fase B adds the market side — without prices, production volumes
 * are inert. With prices we can cross "Chile produces X kt of copper" against
 * "current benchmark $9k/t" to estimate export value + shock exposure.
 *
 * 15 core commodities (energy, metals, precious, agri). Monthly series aggregated
 * to annual averages on the WLD entity (same pattern as FAO FPI). The latest
 * month value is preserved in `meta` so the dashboard shows both annual trends
 * and a live tick.
 *
 * Lithium / cobalt / graphite / rare earths are NOT in Pink Sheet — WB does not
 * publish them. That coverage lives in P3 A3 (USGS production). See DECISIONS.md.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const XLSX_URL =
  'https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx';

const SHEET_NAME = 'Monthly Prices';
const YEAR_MIN = 1990;

/**
 * Each commodity maps to one Pink Sheet column. `matchTokens` are lowercase
 * substrings that must ALL appear in the column header (after trim). WB uses
 * inconsistent formatting like "Crude oil, Brent", "Crude oil, Brent **", or
 * splits "Crude oil," on one row and "Brent" on another — we match by tokens
 * to be robust. `exclude` prevents false matches (e.g., "Brent" matching WTI).
 */
interface CommoditySpec {
  code: string;
  name: string;
  unit: string;
  category: 'Energy' | 'Metals' | 'Precious' | 'Agriculture';
  matchTokens: string[];
  excludeTokens?: string[];
}

const COMMODITIES: CommoditySpec[] = [
  // Energy
  { code: 'BRENT_USD_BBL',         name: 'Crude Oil (Brent)',       unit: 'USD/bbl',    category: 'Energy', matchTokens: ['crude oil', 'brent'] },
  { code: 'WTI_USD_BBL',           name: 'Crude Oil (WTI)',         unit: 'USD/bbl',    category: 'Energy', matchTokens: ['crude oil', 'wti'] },
  { code: 'HENRY_HUB_USD_MMBTU',   name: 'Natural Gas (US)',        unit: 'USD/mmbtu',  category: 'Energy', matchTokens: ['natural gas', 'us'], excludeTokens: ['europe', 'japan', 'index'] },
  { code: 'TTF_USD_MMBTU',         name: 'Natural Gas (Europe)',    unit: 'USD/mmbtu',  category: 'Energy', matchTokens: ['natural gas', 'europe'] },
  { code: 'COAL_AU_USD_MT',        name: 'Coal (Australian)',       unit: 'USD/mt',     category: 'Energy', matchTokens: ['coal', 'australian'] },

  // Metals (industrial)
  { code: 'COPPER_USD_MT',         name: 'Copper',                  unit: 'USD/mt',     category: 'Metals', matchTokens: ['copper'] },
  { code: 'NICKEL_USD_MT',         name: 'Nickel',                  unit: 'USD/mt',     category: 'Metals', matchTokens: ['nickel'] },
  { code: 'ALUMINUM_USD_MT',       name: 'Aluminum',                unit: 'USD/mt',     category: 'Metals', matchTokens: ['aluminum'] },
  { code: 'ZINC_USD_MT',           name: 'Zinc',                    unit: 'USD/mt',     category: 'Metals', matchTokens: ['zinc'] },

  // Precious
  { code: 'GOLD_USD_OZT',          name: 'Gold',                    unit: 'USD/oz',     category: 'Precious', matchTokens: ['gold'] },
  { code: 'SILVER_USD_OZT',        name: 'Silver',                  unit: 'USD/oz',     category: 'Precious', matchTokens: ['silver'] },

  // Agriculture (cross-reference with A4 crops + A5 FPI)
  { code: 'WHEAT_USD_MT',          name: 'Wheat (US HRW)',          unit: 'USD/mt',     category: 'Agriculture', matchTokens: ['wheat', 'us'], excludeTokens: ['soft'] },
  { code: 'MAIZE_USD_MT',          name: 'Maize',                   unit: 'USD/mt',     category: 'Agriculture', matchTokens: ['maize'] },
  { code: 'SOYBEAN_USD_MT',        name: 'Soybeans',                unit: 'USD/mt',     category: 'Agriculture', matchTokens: ['soybeans'], excludeTokens: ['oil', 'meal'] },
  { code: 'PALM_OIL_USD_MT',       name: 'Palm Oil',                unit: 'USD/mt',     category: 'Agriculture', matchTokens: ['palm oil'] },
];

async function ensureIndicators() {
  for (const c of COMMODITIES) {
    await prisma.indicator.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        name: c.name,
        topic: 'Commodity Prices',
        unit: c.unit,
        source: 'World Bank Pink Sheet',
        description: `Monthly nominal price, annual average. Source: WB Commodity Markets. Category: ${c.category}.`,
      },
      update: {
        name: c.name,
        topic: 'Commodity Prices',
        unit: c.unit,
        source: 'World Bank Pink Sheet',
      },
    });
  }
  console.log(`  ${COMMODITIES.length} Pink Sheet indicators ensured`);
}

async function getOrCreateWorldEntity(): Promise<string> {
  const world = await prisma.entity.upsert({
    where: { slug: 'world' },
    update: {},
    create: {
      type: 'REGION',
      name: 'World',
      slug: 'world',
      iso3: 'WLD',
      region: 'Global',
    },
    select: { id: true },
  });
  return world.id;
}

/**
 * Normalize a header cell: trim, collapse whitespace, lowercase. WB embeds
 * footnote markers like "**", "/a", or trailing units — we keep them but
 * tokenize for matching purposes.
 */
function normalizeHeader(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).replace(/\s+/g, ' ').trim().toLowerCase();
}

function matchCommodity(header: string, spec: CommoditySpec): boolean {
  if (!header) return false;
  for (const tok of spec.matchTokens) {
    if (!header.includes(tok)) return false;
  }
  if (spec.excludeTokens) {
    for (const tok of spec.excludeTokens) {
      if (header.includes(tok)) return false;
    }
  }
  return true;
}

/**
 * Parse a WB Pink Sheet date label. Accepted shapes (all seen in the wild):
 *   - Excel serial numbers: 43831 → Excel epoch Jan-2020
 *   - "1960M01", "1960-01", "Jan 1960", "1960/01"
 * Returns { year, month } or null if unparseable.
 */
function parseWbDate(raw: unknown): { year: number; month: number } | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Excel serial
  if (typeof raw === 'number' && isFinite(raw) && raw > 10000 && raw < 80000) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m) return { year: parsed.y, month: parsed.m };
  }

  const s = String(raw).trim();
  // 1960M01 or 1960m01
  const m1 = s.match(/^(\d{4})[Mm](\d{1,2})$/);
  if (m1) return { year: parseInt(m1[1], 10), month: parseInt(m1[2], 10) };
  // 1960-01 or 1960/01
  const m2 = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m2) return { year: parseInt(m2[1], 10), month: parseInt(m2[2], 10) };
  // Jan 1960, January 1960
  const m3 = s.match(/^([A-Za-z]+)[\s-]+(\d{4})$/);
  if (m3) {
    const monthIx = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
      .indexOf(m3[1].slice(0, 3).toLowerCase());
    if (monthIx >= 0) return { year: parseInt(m3[2], 10), month: monthIx + 1 };
  }
  return null;
}

async function main() {
  console.log('\n=== WorldLore: World Bank Pink Sheet Ingestion (P3 B) ===\n');

  await ensureIndicators();
  const worldEntityId = await getOrCreateWorldEntity();
  console.log(`  World entity: ${worldEntityId}\n`);

  console.log('  Downloading Pink Sheet XLSX...');
  const { data: buf } = await axios.get<ArrayBuffer>(XLSX_URL, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });
  console.log(`  Downloaded ${(buf.byteLength / 1024).toFixed(0)} KB`);

  const wb = XLSX.read(Buffer.from(buf), { type: 'buffer' });
  if (!wb.SheetNames.includes(SHEET_NAME)) {
    throw new Error(`Sheet "${SHEET_NAME}" not found. Available: ${wb.SheetNames.join(', ')}`);
  }
  const sheet = wb.Sheets[SHEET_NAME];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }) as unknown[][];
  console.log(`  Read ${rows.length} raw rows`);

  // Detect the header row: first row whose cells include "crude oil" AND "brent"
  // somewhere. Column A is always the date axis, so we scan columns 1..N.
  let headerRowIx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const joined = rows[i].map(normalizeHeader).join(' | ');
    if (joined.includes('crude oil') && joined.includes('brent')) {
      headerRowIx = i;
      break;
    }
  }
  if (headerRowIx < 0) throw new Error('Could not locate header row with "Crude oil, Brent"');
  console.log(`  Header row detected at index ${headerRowIx}`);

  // WB often splits long headers across two rows (row N = "Crude oil,", row N+1 = "Brent").
  // Merge headerRowIx with the next row when cells are empty/NA on one side.
  const headerA = rows[headerRowIx].map(normalizeHeader);
  const headerB = headerRowIx + 1 < rows.length ? rows[headerRowIx + 1].map(normalizeHeader) : [];
  const mergedHeader: string[] = [];
  const maxCols = Math.max(headerA.length, headerB.length);
  for (let c = 0; c < maxCols; c++) {
    const a = headerA[c] || '';
    const b = headerB[c] || '';
    mergedHeader.push([a, b].filter(Boolean).join(' ').trim());
  }

  // Map each target commodity to its column index
  const colIndexByCode = new Map<string, number>();
  for (const spec of COMMODITIES) {
    let chosen = -1;
    for (let c = 1; c < mergedHeader.length; c++) {
      if (matchCommodity(mergedHeader[c], spec)) { chosen = c; break; }
    }
    if (chosen < 0) {
      console.warn(`  WARN: no column matched for ${spec.code} (tokens: ${spec.matchTokens.join('+')})`);
      continue;
    }
    colIndexByCode.set(spec.code, chosen);
  }
  console.log(`  Matched columns: ${colIndexByCode.size}/${COMMODITIES.length}`);

  // Data rows start after merged header (headerRowIx + 2 usually, or +1 if no split)
  const dataStart = headerRowIx + 2;

  // Per indicator, aggregate monthly → annual average + latest month snapshot
  type Bucket = { sum: number; count: number; latestMonth: number; latestValue: number };
  const agg: Record<string, Map<number, Bucket>> = {};
  for (const code of colIndexByCode.keys()) agg[code] = new Map();

  let monthlyPointsUsed = 0;
  let latestMonthOverall = 0;
  let latestYearOverall = 0;

  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const dateCell = r[0];
    const ym = parseWbDate(dateCell);
    if (!ym) continue;
    if (ym.year < YEAR_MIN) continue;

    const serialKey = ym.year * 100 + ym.month;
    if (serialKey > latestYearOverall * 100 + latestMonthOverall) {
      latestYearOverall = ym.year;
      latestMonthOverall = ym.month;
    }

    for (const [code, col] of colIndexByCode) {
      const raw = r[col];
      if (raw === null || raw === undefined || raw === '' || raw === '..' || raw === 'n.a.') continue;
      const v = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, ''));
      if (!isFinite(v)) continue;

      monthlyPointsUsed++;
      const map = agg[code];
      const bucket = map.get(ym.year);
      if (!bucket) {
        map.set(ym.year, { sum: v, count: 1, latestMonth: ym.month, latestValue: v });
      } else {
        bucket.sum += v;
        bucket.count += 1;
        if (ym.month > bucket.latestMonth) {
          bucket.latestMonth = ym.month;
          bucket.latestValue = v;
        }
      }
    }
  }

  console.log(`  Monthly data points used: ${monthlyPointsUsed}`);
  console.log(`  Latest observation: ${latestYearOverall}-${String(latestMonthOverall).padStart(2, '0')}`);

  // Build upsert rows
  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  const stats: Record<string, number> = {};

  for (const [code, yearMap] of Object.entries(agg)) {
    for (const [year, bucket] of yearMap) {
      const avg = bucket.sum / bucket.count;
      if (!isFinite(avg)) continue;
      upsertRows.push({
        id: randomUUID(),
        entityId: worldEntityId,
        indicatorCode: code,
        year,
        value: Number(avg.toFixed(4)),
        source: 'World Bank Pink Sheet',
        meta: {
          latestMonth: bucket.latestMonth,
          latestValue: Number(bucket.latestValue.toFixed(4)),
          monthsCount: bucket.count,
        },
      });
      stats[code] = (stats[code] || 0) + 1;
    }
  }

  console.log('\n  Rows per indicator:');
  for (const [code, count] of Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${code.padEnd(24)} ${count.toString().padStart(4)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} annual-average rows to entity WLD...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log('  Done.');
  }

  console.log('\n=== WB Pink Sheet Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
