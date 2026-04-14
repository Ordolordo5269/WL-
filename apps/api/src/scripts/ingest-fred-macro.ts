/**
 * Ingest FRED (Federal Reserve Economic Data) — FX, Rates, Equities, Vol
 *
 * P1 Fase A · Macro + Financial markets
 *
 * Source: Federal Reserve Bank of St. Louis — FRED API v3
 * Docs: https://fred.stlouisfed.org/docs/api/fred/
 * Key: gratis en fred.stlouisfed.org/docs/api/api_key.html
 * Rate limit: 120 req/min — ingesta manual es mucho menos que eso
 * Licencia: US government public domain + fair use
 *
 * Series objetivo:
 *   FX       — DTWEXBGS (dollar index), DEXUSEU, DEXJPUS, DEXCHUS, DEXBZUS,
 *              DEXMXUS, DEXINUS, DEXTHUS
 *   Rates    — DGS10 (10Y UST), IRLTLT01DEM156N (10Y Bund), IRLTLT01JPM156N (10Y JGB),
 *              DFF (Fed funds), SOFR
 *   Vol      — VIXCLS, BAMLH0A0HYM2 (HY spread)
 *   Equities — SP500, NASDAQCOM, DJIA, NIKKEI225
 *
 * Valores se almacenan como promedio anual en la entidad WLD (patrón FAO FPI).
 * `meta.latestMonth/latestValue` preserva el último punto mensual.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const YEAR_MIN = 1990;

interface FredSpec {
  fredId: string;     // FRED series ID
  code: string;       // our IndicatorValue code
  name: string;
  unit: string;
  category: 'FX' | 'Rates' | 'Vol' | 'Equity';
}

const SERIES: FredSpec[] = [
  // FX — values in "local currency per USD" except DEXUSEU which is USD per EUR
  { fredId: 'DTWEXBGS',        code: 'DXY_BROAD',         name: 'US Dollar Index (Broad)',   unit: 'index_2006=100', category: 'FX' },
  { fredId: 'DEXUSEU',         code: 'FX_USD_EUR',        name: 'USD per EUR',                unit: 'USD/EUR',        category: 'FX' },
  { fredId: 'DEXJPUS',         code: 'FX_JPY_USD',        name: 'JPY per USD',                unit: 'JPY/USD',        category: 'FX' },
  { fredId: 'DEXCHUS',         code: 'FX_CNY_USD',        name: 'CNY per USD',                unit: 'CNY/USD',        category: 'FX' },
  { fredId: 'DEXBZUS',         code: 'FX_BRL_USD',        name: 'BRL per USD',                unit: 'BRL/USD',        category: 'FX' },
  { fredId: 'DEXMXUS',         code: 'FX_MXN_USD',        name: 'MXN per USD',                unit: 'MXN/USD',        category: 'FX' },
  { fredId: 'DEXINUS',         code: 'FX_INR_USD',        name: 'INR per USD',                unit: 'INR/USD',        category: 'FX' },
  { fredId: 'DEXTHUS',         code: 'FX_THB_USD',        name: 'THB per USD',                unit: 'THB/USD',        category: 'FX' },

  // Rates — all as % annualized
  { fredId: 'DGS10',           code: 'RATE_10Y_UST',      name: '10-Year US Treasury Yield',  unit: '%',              category: 'Rates' },
  { fredId: 'IRLTLT01DEM156N', code: 'RATE_10Y_BUND',     name: '10-Year German Bund',        unit: '%',              category: 'Rates' },
  { fredId: 'IRLTLT01JPM156N', code: 'RATE_10Y_JGB',      name: '10-Year Japanese JGB',       unit: '%',              category: 'Rates' },
  { fredId: 'DFF',             code: 'RATE_FED_FUNDS',    name: 'Federal Funds Rate',         unit: '%',              category: 'Rates' },
  { fredId: 'SOFR',            code: 'RATE_SOFR',         name: 'Secured Overnight Fin. Rate',unit: '%',              category: 'Rates' },

  // Vol / stress
  { fredId: 'VIXCLS',          code: 'VIX',               name: 'VIX Volatility Index',       unit: 'index',          category: 'Vol' },
  { fredId: 'BAMLH0A0HYM2',    code: 'HY_OAS_SPREAD',     name: 'HY Option-Adjusted Spread',  unit: '%',              category: 'Vol' },

  // Equity indices
  { fredId: 'SP500',           code: 'EQ_SP500',          name: 'S&P 500 Index',              unit: 'points',         category: 'Equity' },
  { fredId: 'NASDAQCOM',       code: 'EQ_NASDAQ',         name: 'NASDAQ Composite',           unit: 'points',         category: 'Equity' },
  { fredId: 'DJIA',            code: 'EQ_DJIA',           name: 'Dow Jones Industrial Avg',   unit: 'points',         category: 'Equity' },
  { fredId: 'NIKKEI225',       code: 'EQ_NIKKEI',         name: 'Nikkei 225 Index',           unit: 'points',         category: 'Equity' },
];

async function ensureIndicators() {
  for (const s of SERIES) {
    await prisma.indicator.upsert({
      where: { code: s.code },
      create: {
        code: s.code,
        name: s.name,
        topic: 'Financial Markets',
        unit: s.unit,
        source: 'FRED',
        description: `Category: ${s.category}. FRED series ${s.fredId}. Monthly average stored on WLD with latest tick in meta.`,
      },
      update: { name: s.name, topic: 'Financial Markets', unit: s.unit, source: 'FRED' },
    });
  }
  console.log(`  ${SERIES.length} FRED indicators ensured`);
}

async function getOrCreateWorldEntity(): Promise<string> {
  const world = await prisma.entity.upsert({
    where: { slug: 'world' },
    update: {},
    create: { type: 'REGION', name: 'World', slug: 'world', iso3: 'WLD', region: 'Global' },
    select: { id: true },
  });
  return world.id;
}

interface FredObservation { date: string; value: string }
interface FredResponse { observations: FredObservation[] }

async function fetchSeries(apiKey: string, seriesId: string): Promise<Map<string, number>> {
  // FRED returns daily/monthly depending on series. We aggregate to monthly.
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${YEAR_MIN}-01-01`;
  const { data } = await axios.get<FredResponse>(url, { timeout: 60000 });

  // Monthly average: group by YYYY-MM
  const monthly = new Map<string, { sum: number; count: number }>();
  for (const obs of data.observations) {
    if (!obs.date || obs.value === '.' || obs.value === '' || obs.value === null) continue;
    const v = parseFloat(obs.value);
    if (!isFinite(v)) continue;
    const ym = obs.date.slice(0, 7); // YYYY-MM
    const bucket = monthly.get(ym);
    if (!bucket) monthly.set(ym, { sum: v, count: 1 });
    else { bucket.sum += v; bucket.count += 1; }
  }

  const out = new Map<string, number>();
  for (const [ym, bucket] of monthly) out.set(ym, bucket.sum / bucket.count);
  return out;
}

async function main() {
  console.log('\n=== WorldLore: FRED Macro Ingestion (P1 Fase A) ===\n');

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error('  ERROR: FRED_API_KEY missing in environment. Get one free at https://fred.stlouisfed.org/docs/api/api_key.html');
    process.exit(1);
  }

  await ensureIndicators();
  const worldEntityId = await getOrCreateWorldEntity();
  console.log(`  World entity: ${worldEntityId}\n`);

  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  const stats: Record<string, number> = {};

  for (const s of SERIES) {
    process.stdout.write(`  Fetching ${s.fredId} (${s.code})... `);
    try {
      const monthly = await fetchSeries(apiKey, s.fredId);

      // Aggregate to annual
      type Bucket = { sum: number; count: number; latestMonth: number; latestValue: number };
      const annual = new Map<number, Bucket>();
      for (const [ym, v] of monthly) {
        const [yearStr, monthStr] = ym.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        if (year < YEAR_MIN) continue;
        const bucket = annual.get(year);
        if (!bucket) annual.set(year, { sum: v, count: 1, latestMonth: month, latestValue: v });
        else {
          bucket.sum += v;
          bucket.count += 1;
          if (month > bucket.latestMonth) { bucket.latestMonth = month; bucket.latestValue = v; }
        }
      }

      for (const [year, b] of annual) {
        upsertRows.push({
          id: randomUUID(),
          entityId: worldEntityId,
          indicatorCode: s.code,
          year,
          value: Number((b.sum / b.count).toFixed(4)),
          source: 'FRED',
          meta: {
            latestMonth: b.latestMonth,
            latestValue: Number(b.latestValue.toFixed(4)),
            monthsCount: b.count,
            fredSeriesId: s.fredId,
          },
        });
      }
      stats[s.code] = annual.size;
      console.log(`${annual.size} years`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
    }

    // Be polite: FRED allows 120 req/min but we don't need to hammer it
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('\n  Rows per indicator:');
  for (const [code, count] of Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`    ${code.padEnd(22)} ${count.toString().padStart(4)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} annual rows to WLD...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log('  Done.');
  }

  console.log('\n=== FRED Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
