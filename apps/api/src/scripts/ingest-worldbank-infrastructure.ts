/**
 * WorldLore: Infrastructure Indicator Ingestion
 *
 * Ingests 2 new World Bank indicators for Infrastructure & Connectivity:
 * - IS.AIR.PSGR → AIR_TRANSPORT_PASSENGERS
 * - IT.NET.SECR.P6 → SECURE_INTERNET_SERVERS_PER_MILLION
 *
 * Uses bulk SQL INSERT ON CONFLICT for speed (~500 rows per batch).
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;
const BATCH_SIZE = 500;

const ALL_INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string | null; section: string }> = [
  { section: 'Infrastructure', code: 'AIR_TRANSPORT_PASSENGERS', wb: 'IS.AIR.PSGR', name: 'Air transport, passengers carried', unit: 'people' },
  { section: 'Infrastructure', code: 'SECURE_INTERNET_SERVERS_PER_MILLION', wb: 'IT.NET.SECR.P6', name: 'Secure Internet servers (per 1 million people)', unit: 'per_million' },
];

async function ensureIndicators() {
  console.log('Ensuring all indicators exist in database...');
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

async function bulkUpsert(rows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: any }>) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const values = batch.map(r => {
      const metaJson = r.meta ? JSON.stringify(r.meta).replace(/'/g, "''") : null;
      const valStr = r.value.toString();
      return `('${r.id}', '${r.entityId}', '${r.indicatorCode}', ${r.year}, ${valStr}, '${r.source}', ${metaJson ? `'${metaJson}'::jsonb` : 'NULL'}, NOW())`;
    }).join(',\n');

    await prisma.$executeRawUnsafe(`
      INSERT INTO "IndicatorValue" ("id", "entityId", "indicatorCode", "year", "value", "source", "meta", "revisedAt")
      VALUES ${values}
      ON CONFLICT ("entityId", "indicatorCode", "year")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "source" = EXCLUDED."source",
        "meta" = COALESCE(EXCLUDED."meta", "IndicatorValue"."meta"),
        "revisedAt" = NOW()
    `);
  }
}

async function main() {
  console.log('\n=== WorldLore: Infrastructure Indicator Ingestion (2 new indicators) ===\n');
  console.log(`Target year: ${TARGET_LATEST_YEAR}`);
  console.log(`Total indicators: ${ALL_INDICATORS.length}`);
  console.log(`Strategy: Bulk fetch + bulk SQL INSERT ON CONFLICT\n`);

  await ensureIndicators();

  // Build iso3 -> entityId lookup
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
  console.log(`Loaded ${Object.keys(iso3ToEntityId).length} unique country entities\n`);

  let totalUpserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < ALL_INDICATORS.length; i++) {
    const it = ALL_INDICATORS[i];
    const t0 = Date.now();
    console.log(`[${i + 1}/${ALL_INDICATORS.length}] ${it.section.padEnd(14)} ${it.code} (${it.wb})`);

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
          upsertRows.push({
            id: randomUUID(),
            entityId,
            indicatorCode: it.code,
            year: p.year,
            value: p.value,
            source: 'World Bank',
            meta: null
          });
        }

        // Fallback at TARGET_LATEST_YEAR
        points.sort((a, b) => b.year - a.year);
        const latest = points[0];
        const targetYearPoint = points.find(p => p.year === TARGET_LATEST_YEAR);

        if (!targetYearPoint) {
          upsertRows.push({
            id: randomUUID(),
            entityId,
            indicatorCode: it.code,
            year: TARGET_LATEST_YEAR,
            value: latest.value,
            source: 'World Bank',
            meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true }
          });
        }
      }

      await bulkUpsert(upsertRows);
      totalUpserted += upsertRows.length;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  Upserted ${upsertRows.length} rows for ${byIso3.size} countries (${elapsed}s)\n`);
    } catch (err) {
      totalErrors++;
      console.log(`  ERROR: ${(err as Error).message}\n`);
    }
  }

  console.log('\n=== Ingestion Complete ===');
  console.log(`Total upserted records: ${totalUpserted}`);
  console.log(`Errors: ${totalErrors}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
