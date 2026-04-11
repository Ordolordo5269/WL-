/**
 * WorldLore: Final Geopolitical Indicators (2 remaining)
 * - Food Production Index (AG.PRD.FOOD.XD) — food security
 * - External Debt % GNI (DT.DOD.DECT.GN.ZS) — financial vulnerability
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

const ALL_INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string | null; section: string }> = [
  { section: 'Economy', code: 'EXTERNAL_DEBT_PCT_GNI', wb: 'DT.DOD.DECT.GN.ZS', name: 'External debt stocks (% of GNI)', unit: 'percent' },
  { section: 'International', code: 'FOOD_PRODUCTION_INDEX', wb: 'AG.PRD.FOOD.XD', name: 'Food production index (2014-2016 = 100)', unit: 'index' },
];

async function ensureIndicators() {
  console.log('Ensuring indicators exist in database...');
  for (const it of ALL_INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.section, unit: it.unit ?? undefined, source: 'World Bank' },
      update: { name: it.name, topic: it.section, unit: it.unit ?? undefined, source: 'World Bank' }
    });
  }
  console.log(`  ${ALL_INDICATORS.length} indicators ensured`);
}

async function fetchBulkIndicator(wbCode: string): Promise<Array<{ iso3: string; year: number; value: number }>> {
  const results: Array<{ iso3: string; year: number; value: number }> = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${WB_BASE}/country/all/indicator/${encodeURIComponent(wbCode)}?format=json&per_page=20000&page=${page}`;
    const { data } = await axios.get(url, { timeout: 30000 });
    if (page === 1 && data?.[0]) totalPages = data[0].pages || 1;

    const rows: any[] = Array.isArray(data?.[1]) ? data[1] : [];
    for (const r of rows) {
      const iso3: string | undefined = r?.countryiso3code || r?.country?.id;
      if (!iso3 || iso3.length !== 3) continue;
      if (r.value === null || r.value === undefined) continue;
      const year = parseInt(r.date, 10);
      if (isNaN(year)) continue;
      const value = Number(r.value);
      if (!Number.isFinite(value)) continue;
      results.push({ iso3: iso3.toUpperCase(), year, value });
    }
    page++;
  }
  return results;
}

async function main() {
  console.log('\n=== WorldLore: Final Geopolitical Indicators (2) ===\n');

  await ensureIndicators();

  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, _count: { select: { indicators: true } } }
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) {
    const key = (e.iso3 as string).toUpperCase();
    if (!iso3ToEntityId[key] || e._count.indicators > 0) {
      iso3ToEntityId[key] = e.id;
    }
  }
  console.log(`Loaded ${Object.keys(iso3ToEntityId).length} entities\n`);

  let totalUpserted = 0;

  for (let i = 0; i < ALL_INDICATORS.length; i++) {
    const it = ALL_INDICATORS[i];
    const t0 = Date.now();
    console.log(`[${i + 1}/${ALL_INDICATORS.length}] ${it.code} (${it.wb})`);

    try {
      const rows = await fetchBulkIndicator(it.wb);
      console.log(`  Fetched ${rows.length} data points`);

      const byIso3 = new Map<string, Array<{ year: number; value: number }>>();
      for (const r of rows) {
        if (!iso3ToEntityId[r.iso3]) continue;
        if (!byIso3.has(r.iso3)) byIso3.set(r.iso3, []);
        byIso3.get(r.iso3)!.push({ year: r.year, value: r.value });
      }

      const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: any }> = [];

      for (const [iso3, points] of byIso3) {
        const entityId = iso3ToEntityId[iso3];
        if (!entityId) continue;
        for (const p of points) {
          upsertRows.push({ id: randomUUID(), entityId, indicatorCode: it.code, year: p.year, value: p.value, source: 'World Bank', meta: null });
        }
        points.sort((a, b) => b.year - a.year);
        const latest = points[0];
        if (!points.find(p => p.year === TARGET_LATEST_YEAR)) {
          upsertRows.push({ id: randomUUID(), entityId, indicatorCode: it.code, year: TARGET_LATEST_YEAR, value: latest.value, source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true } });
        }
      }

      await bulkUpsertIndicatorValues(prisma, upsertRows);
      totalUpserted += upsertRows.length;
      console.log(`  Upserted ${upsertRows.length} rows for ${byIso3.size} countries (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
    } catch (err) {
      console.log(`  ERROR: ${(err as Error).message}\n`);
    }
  }

  console.log(`\n=== Done. Total: ${totalUpserted} records ===`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
