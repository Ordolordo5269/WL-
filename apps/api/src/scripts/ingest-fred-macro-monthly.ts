/**
 * Ingest FRED — Monthly granularity for ML
 *
 * P1 Fase B · Pays the technical debt from Fase A (annual-only).
 *
 * Same 19 series as ingest-fred-macro.ts but stores each monthly average
 * as a separate row in FinancialMarketMonthly instead of aggregating to
 * annual. Coexists with the annual data in IndicatorValue — dashboard
 * reads annual, ML reads monthly.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertMonthly, type UpsertMonthlyRow } from './lib/bulk-upsert-monthly';

const prisma = new PrismaClient();

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const YEAR_MIN = 1990;
const TABLE_NAME = 'FinancialMarketMonthly';

interface FredSpec { fredId: string; code: string; name: string }

const SERIES: FredSpec[] = [
  { fredId: 'DTWEXBGS',        code: 'DXY_BROAD' ,        name: 'US Dollar Index (Broad)' },
  { fredId: 'DEXUSEU',         code: 'FX_USD_EUR',        name: 'USD per EUR' },
  { fredId: 'DEXJPUS',         code: 'FX_JPY_USD',        name: 'JPY per USD' },
  { fredId: 'DEXCHUS',         code: 'FX_CNY_USD',        name: 'CNY per USD' },
  { fredId: 'DEXBZUS',         code: 'FX_BRL_USD',        name: 'BRL per USD' },
  { fredId: 'DEXMXUS',         code: 'FX_MXN_USD',        name: 'MXN per USD' },
  { fredId: 'DEXINUS',         code: 'FX_INR_USD',        name: 'INR per USD' },
  { fredId: 'DEXTHUS',         code: 'FX_THB_USD',        name: 'THB per USD' },
  { fredId: 'DGS10',           code: 'RATE_10Y_UST',      name: '10-Year US Treasury Yield' },
  { fredId: 'IRLTLT01DEM156N', code: 'RATE_10Y_BUND',     name: '10-Year German Bund' },
  { fredId: 'IRLTLT01JPM156N', code: 'RATE_10Y_JGB',      name: '10-Year Japanese JGB' },
  { fredId: 'DFF',             code: 'RATE_FED_FUNDS',    name: 'Federal Funds Rate' },
  { fredId: 'SOFR',            code: 'RATE_SOFR',         name: 'Secured Overnight Fin. Rate' },
  { fredId: 'VIXCLS',          code: 'VIX',               name: 'VIX Volatility Index' },
  { fredId: 'BAMLH0A0HYM2',    code: 'HY_OAS_SPREAD',     name: 'HY Option-Adjusted Spread' },
  { fredId: 'SP500',           code: 'EQ_SP500',          name: 'S&P 500 Index' },
  { fredId: 'NASDAQCOM',       code: 'EQ_NASDAQ',         name: 'NASDAQ Composite' },
  { fredId: 'DJIA',            code: 'EQ_DJIA',           name: 'Dow Jones Industrial Avg' },
  { fredId: 'NIKKEI225',       code: 'EQ_NIKKEI',         name: 'Nikkei 225 Index' },
];

async function getOrCreateWorldEntity(): Promise<string> {
  const world = await prisma.entity.upsert({
    where: { slug: 'world' },
    update: {},
    create: { type: 'REGION', name: 'World', slug: 'world', iso3: 'WLD', region: 'Global' },
    select: { id: true },
  });
  return world.id;
}

interface FredResponse { observations: Array<{ date: string; value: string }> }

async function fetchSeries(apiKey: string, seriesId: string): Promise<Map<string, number>> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${YEAR_MIN}-01-01`;
  const { data } = await axios.get<FredResponse>(url, { timeout: 60000 });

  const monthly = new Map<string, { sum: number; count: number }>();
  for (const obs of data.observations) {
    if (!obs.date || obs.value === '.' || obs.value === '' || obs.value === null) continue;
    const v = parseFloat(obs.value);
    if (!isFinite(v)) continue;
    const ym = obs.date.slice(0, 7);
    const bucket = monthly.get(ym);
    if (!bucket) monthly.set(ym, { sum: v, count: 1 });
    else { bucket.sum += v; bucket.count += 1; }
  }

  const out = new Map<string, number>();
  for (const [ym, bucket] of monthly) out.set(ym, bucket.sum / bucket.count);
  return out;
}

async function main() {
  console.log('\n=== WorldLore: FRED Monthly Ingestion (P1 Fase B) ===\n');

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error('  ERROR: FRED_API_KEY missing in environment.');
    process.exit(1);
  }

  const worldEntityId = await getOrCreateWorldEntity();
  console.log(`  World entity: ${worldEntityId}\n`);

  const upsertRows: UpsertMonthlyRow[] = [];
  const stats: Record<string, number> = {};

  for (const s of SERIES) {
    process.stdout.write(`  Fetching ${s.fredId} (${s.code})... `);
    try {
      const monthly = await fetchSeries(apiKey, s.fredId);
      let count = 0;

      for (const [ym, value] of monthly) {
        const [yearStr, monthStr] = ym.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (year < YEAR_MIN || !isFinite(value)) continue;

        upsertRows.push({
          id: randomUUID(),
          entityId: worldEntityId,
          indicatorCode: s.code,
          year,
          month,
          value: Number(value.toFixed(6)),
          source: 'FRED',
        });
        count++;
      }

      stats[s.code] = count;
      console.log(`${count} months`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('\n  Rows per indicator:');
  for (const [code, count] of Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${code.padEnd(22)} ${count.toString().padStart(5)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} monthly rows to ${TABLE_NAME}...`);
    await bulkUpsertMonthly(prisma, TABLE_NAME, upsertRows);
    console.log('  Done.');
  }

  console.log('\n=== FRED Monthly Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
