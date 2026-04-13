/**
 * WorldLore: Fix Archived World Bank Indicators
 *
 * Several WB indicator codes used in the expansion ingestion have been
 * archived/retired by the World Bank. This script re-ingests them using
 * the current replacement codes.
 *
 * Replacements:
 *   EN.ATM.CO2E.PC  → EN.GHG.CO2.PC.CE.AR5   (CO2 per capita)
 *   EN.ATM.CO2E.KT  → EN.GHG.CO2.MT.CE.AR5   (CO2 total, now in Mt CO2e)
 *   SM.POP.REFG.OR  → SM.POP.RHCR.EO          (Refugees by origin)
 *   SM.POP.REFG     → SM.POP.RHCR.EA          (Refugees by asylum)
 *   EN.CO2.ETOT.ZS  → EN.GHG.CO2.PI.MT.CE.AR5 (CO2 from power industry, Mt)
 *   EN.ATM.METH.KT.CE → EN.GHG.CH4.MT.CE.AR5  (Methane, now in Mt CO2e)
 *   NY.GDP.PETR.RT.ZS → retry same code          (Oil rents - was transient error)
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

// internal code → new WB code
const FIX_INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string }> = [
  { code: 'CO2_EMISSIONS_PER_CAPITA', wb: 'EN.GHG.CO2.PC.CE.AR5', name: 'CO2 emissions per capita (t CO2e)', unit: 'metric_tons' },
  { code: 'CO2_EMISSIONS_TOTAL_KT', wb: 'EN.GHG.CO2.MT.CE.AR5', name: 'CO2 emissions total excl. LULUCF (Mt CO2e)', unit: 'mt_co2e' },
  { code: 'REFUGEE_POP_BY_ORIGIN', wb: 'SM.POP.RHCR.EO', name: 'Refugees by country/territory of origin (UNHCR)', unit: 'people' },
  { code: 'REFUGEE_POP_BY_ASYLUM', wb: 'SM.POP.RHCR.EA', name: 'Refugees by country/territory of asylum (UNHCR)', unit: 'people' },
  { code: 'CO2_FROM_ELECTRICITY_PCT', wb: 'EN.GHG.CO2.PI.MT.CE.AR5', name: 'CO2 from power industry (Mt CO2e)', unit: 'mt_co2e' },
  { code: 'METHANE_EMISSIONS_KT_CO2EQ', wb: 'EN.GHG.CH4.MT.CE.AR5', name: 'Methane emissions excl. LULUCF (Mt CO2e)', unit: 'mt_co2e' },
  { code: 'OIL_RENTS_PCT_GDP', wb: 'NY.GDP.PETR.RT.ZS', name: 'Oil rents (% of GDP)', unit: 'percent' },
];

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
  console.log('\n=== WorldLore: Fix Archived WB Indicators ===\n');
  console.log(`Fixing ${FIX_INDICATORS.length} indicators with updated WB codes\n`);

  // Update indicator metadata with corrected names
  for (const it of FIX_INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: 'Environment', unit: it.unit, source: 'World Bank' },
      update: { name: it.name, unit: it.unit }
    });
  }

  // Build iso3 -> entityId lookup
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true }
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) {
    iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  }
  console.log(`Loaded ${Object.keys(iso3ToEntityId).length} country entities\n`);

  let totalUpserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < FIX_INDICATORS.length; i++) {
    const it = FIX_INDICATORS[i];
    const t0 = Date.now();
    console.log(`[${i + 1}/${FIX_INDICATORS.length}] ${it.code} ← WB: ${it.wb}`);

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
            id: randomUUID(), entityId, indicatorCode: it.code,
            year: p.year, value: p.value, source: 'World Bank', meta: null
          });
        }

        // Fallback at TARGET_LATEST_YEAR
        points.sort((a, b) => b.year - a.year);
        const latest = points[0];
        const targetYearPoint = points.find(p => p.year === TARGET_LATEST_YEAR);
        if (!targetYearPoint) {
          upsertRows.push({
            id: randomUUID(), entityId, indicatorCode: it.code,
            year: TARGET_LATEST_YEAR, value: latest.value, source: 'World Bank',
            meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true }
          });
        }
      }

      await bulkUpsertIndicatorValues(prisma, upsertRows);
      totalUpserted += upsertRows.length;
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  Upserted ${upsertRows.length} rows for ${byIso3.size} countries (${elapsed}s)\n`);
    } catch (err) {
      totalErrors++;
      console.log(`  ERROR: ${(err as Error).message}\n`);
    }
  }

  console.log('\n=== Fix Ingestion Complete ===');
  console.log(`Total upserted: ${totalUpserted}`);
  console.log(`Errors: ${totalErrors}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
