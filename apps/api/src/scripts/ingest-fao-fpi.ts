/**
 * Ingest FAO Food Price Index (FPI)
 *
 * P3 Fase A · Paso A5
 *
 * Source: FAO World Food Situation
 * Monthly CSV: https://www.fao.org/media/docs/worldfoodsituationlibraries/default-document-library/food_price_indices_data.csv
 *
 * Publica un índice global mensual (2014-2016=100) + 5 sub-índices:
 * Meat, Dairy, Cereals, Oils, Sugar. Cobertura: 1990-01 hasta presente.
 *
 * DECISIÓN ARQUITECTÓNICA: FPI es un indicador GLOBAL, no por país. Reutilizamos
 * el schema IndicatorValue(entityId, indicatorCode, year, value) creando una
 * entidad especial `WLD` de tipo REGION (name='World', slug='world') que sirve
 * como "ancla" para todos los indicadores globales futuros.
 *
 * Para respetar el unique key (entityId, indicatorCode, year), guardamos el
 * PROMEDIO ANUAL por indicador y año. El último valor mensual se guarda en
 * `meta` como {latestMonth, latestValue} para leading-indicator use cases.
 *
 * ML/UI value: FPI ha sido leading indicator de crisis (Egipto 2011, Sri Lanka
 * 2022 — FPI subió antes del colapso). Cruzado con Fragility (P2) + food trade
 * deficit (ya ingestado) da una señal fuerte de riesgo de seguridad alimentaria.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const CSV_URL = 'https://www.fao.org/media/docs/worldfoodsituationlibraries/default-document-library/food_price_indices_data.csv';

const INDICATORS = [
  { code: 'FAO_FPI',              name: 'FAO Food Price Index',          unit: 'index_2014_2016', topic: 'Raw Materials' },
  { code: 'FAO_MEAT_PRICE_IDX',   name: 'FAO Meat Price Index',          unit: 'index_2014_2016', topic: 'Raw Materials' },
  { code: 'FAO_DAIRY_PRICE_IDX',  name: 'FAO Dairy Price Index',         unit: 'index_2014_2016', topic: 'Raw Materials' },
  { code: 'FAO_CEREAL_PRICE_IDX', name: 'FAO Cereals Price Index',       unit: 'index_2014_2016', topic: 'Raw Materials' },
  { code: 'FAO_OILS_PRICE_IDX',   name: 'FAO Oils Price Index',          unit: 'index_2014_2016', topic: 'Raw Materials' },
  { code: 'FAO_SUGAR_PRICE_IDX',  name: 'FAO Sugar Price Index',         unit: 'index_2014_2016', topic: 'Raw Materials' },
];

// CSV column → indicator code (position 0 is the "Date" column)
const COL_ORDER: Array<[number, string]> = [
  [1, 'FAO_FPI'],
  [2, 'FAO_MEAT_PRICE_IDX'],
  [3, 'FAO_DAIRY_PRICE_IDX'],
  [4, 'FAO_CEREAL_PRICE_IDX'],
  [5, 'FAO_OILS_PRICE_IDX'],
  [6, 'FAO_SUGAR_PRICE_IDX'],
];

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: {
        code: it.code,
        name: it.name,
        topic: it.topic,
        unit: it.unit,
        source: 'FAO',
        description: 'Global monthly index (2014-2016 = 100). Stored as annual average on entity WLD.',
      },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'FAO' },
    });
  }
  console.log(`  ${INDICATORS.length} FAO FPI indicators ensured`);
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

interface MonthlyRow {
  year: number;
  month: number;
  values: Record<string, number>; // indicatorCode → value
}

function parseFAOCSV(text: string): MonthlyRow[] {
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/);

  const out: MonthlyRow[] = [];

  for (const line of lines) {
    if (!line) continue;
    const cells = line.split(',');
    const dateCell = (cells[0] || '').trim();

    // Match YYYY-MM
    const match = dateCell.match(/^(\d{4})-(\d{2})$/);
    if (!match) continue;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    if (isNaN(year) || year < 1990 || year > 2030) continue;
    if (isNaN(month) || month < 1 || month > 12) continue;

    const values: Record<string, number> = {};
    for (const [idx, code] of COL_ORDER) {
      const raw = (cells[idx] || '').trim();
      if (!raw) continue;
      const v = parseFloat(raw);
      if (!isFinite(v)) continue;
      values[code] = v;
    }

    if (Object.keys(values).length > 0) {
      out.push({ year, month, values });
    }
  }

  return out;
}

/**
 * Aggregate monthly rows to annual averages per indicator.
 * Returns: indicatorCode → Map<year, { avg, latestMonth, latestValue }>
 */
function aggregateAnnual(rows: MonthlyRow[]): Record<string, Map<number, { avg: number; latestMonth: number; latestValue: number; monthsCount: number }>> {
  const out: Record<string, Map<number, { sum: number; count: number; latestMonth: number; latestValue: number }>> = {};

  for (const r of rows) {
    for (const [code, value] of Object.entries(r.values)) {
      if (!out[code]) out[code] = new Map();
      const bucket = out[code].get(r.year);
      if (!bucket) {
        out[code].set(r.year, { sum: value, count: 1, latestMonth: r.month, latestValue: value });
      } else {
        bucket.sum += value;
        bucket.count += 1;
        if (r.month > bucket.latestMonth) {
          bucket.latestMonth = r.month;
          bucket.latestValue = value;
        }
      }
    }
  }

  const result: Record<string, Map<number, { avg: number; latestMonth: number; latestValue: number; monthsCount: number }>> = {};
  for (const [code, yearMap] of Object.entries(out)) {
    const newMap = new Map<number, { avg: number; latestMonth: number; latestValue: number; monthsCount: number }>();
    for (const [year, bucket] of yearMap) {
      newMap.set(year, {
        avg: bucket.sum / bucket.count,
        latestMonth: bucket.latestMonth,
        latestValue: bucket.latestValue,
        monthsCount: bucket.count,
      });
    }
    result[code] = newMap;
  }
  return result;
}

async function main() {
  console.log('\n=== WorldLore: FAO Food Price Index Ingestion (P3 A5) ===\n');

  await ensureIndicators();
  const worldEntityId = await getOrCreateWorldEntity();
  console.log(`  World entity: ${worldEntityId}\n`);

  console.log(`  Fetching FAO FPI CSV...`);
  const { data: csvText } = await axios.get<string>(CSV_URL, {
    timeout: 60000,
    responseType: 'text',
    transformResponse: [(d) => d],
  });
  console.log(`  Downloaded ${(csvText.length / 1024).toFixed(0)} KB`);

  const monthlyRows = parseFAOCSV(csvText);
  console.log(`  Parsed ${monthlyRows.length} monthly rows`);
  if (monthlyRows.length === 0) {
    console.log('  No data parsed. Exiting.');
    return;
  }
  const minYear = Math.min(...monthlyRows.map((r) => r.year));
  const maxYear = Math.max(...monthlyRows.map((r) => r.year));
  console.log(`  Year range: ${minYear}-${maxYear}`);

  const annual = aggregateAnnual(monthlyRows);

  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  const stats: Record<string, number> = {};

  for (const [code, yearMap] of Object.entries(annual)) {
    for (const [year, bucket] of yearMap) {
      upsertRows.push({
        id: randomUUID(),
        entityId: worldEntityId,
        indicatorCode: code,
        year,
        value: Number(bucket.avg.toFixed(3)),
        source: 'FAO',
        meta: {
          latestMonth: bucket.latestMonth,
          latestValue: Number(bucket.latestValue.toFixed(3)),
          monthsCount: bucket.monthsCount,
        },
      });
      stats[code] = (stats[code] || 0) + 1;
    }
  }

  console.log(`\n  Built upserts per indicator:`);
  for (const [code, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${code.padEnd(22)} ${count.toString().padStart(4)}`);
  }

  if (upsertRows.length > 0) {
    console.log(`\n  Upserting ${upsertRows.length} annual-average rows to entity WLD...`);
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Done.`);
  }

  console.log('\n=== FAO FPI Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
