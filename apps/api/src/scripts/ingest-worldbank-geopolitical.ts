/**
 * WorldLore: Geopolitical Indicator Expansion
 *
 * Ingests ~28 new World Bank indicators focused on geopolitical intelligence:
 * - Economy (6): GDP PPP, GDP per capita PPP, exchange rate, labor force, govt revenue/expenditure
 * - Environment (3): Total GHG, fossil fuel consumption, land area
 * - Infrastructure (7): Rail, roads, container ports, air departures/freight, electricity losses/oil
 * - Defense (2): Armed forces % labor, military expenditure % govt
 * - International (3): Merchandise exports/imports, total natural resource rents
 * - Technology (2): Patent applications nonresidents, trademark applications
 * - Society (2): Suicide rate, noncommunicable disease deaths
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
  // ===== ECONOMY (6) =====
  { section: 'Economy', code: 'GDP_PPP_USD', wb: 'NY.GDP.MKTP.PP.CD', name: 'GDP, PPP (current international $)', unit: 'intl_dollar' },
  { section: 'Economy', code: 'GDP_PC_PPP_USD', wb: 'NY.GDP.PCAP.PP.CD', name: 'GDP per capita, PPP (current international $)', unit: 'intl_dollar' },
  { section: 'Economy', code: 'EXCHANGE_RATE_LCU_PER_USD', wb: 'PA.NUS.FCRF', name: 'Official exchange rate (LCU per US$, period average)', unit: 'ratio' },
  { section: 'Economy', code: 'LABOR_FORCE_TOTAL', wb: 'SL.TLF.TOTL.IN', name: 'Labor force, total', unit: 'people' },
  { section: 'Economy', code: 'GOVT_REVENUE_PCT_GDP', wb: 'GC.REV.XGRT.GD.ZS', name: 'Revenue, excluding grants (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'GOVT_EXPENDITURE_PCT_GDP', wb: 'GC.XPN.TOTL.GD.ZS', name: 'Expense (% of GDP)', unit: 'percent' },

  // ===== ENVIRONMENT (3) =====
  { section: 'Environment', code: 'GHG_EMISSIONS_TOTAL_KT', wb: 'EN.ATM.GHGT.KT.CE', name: 'Total greenhouse gas emissions (kt of CO2 equivalent)', unit: 'kt' },
  { section: 'Environment', code: 'FOSSIL_FUEL_CONSUMPTION_PCT', wb: 'EG.USE.COMM.FO.ZS', name: 'Fossil fuel energy consumption (% of total)', unit: 'percent' },
  { section: 'Environment', code: 'LAND_AREA_SQ_KM', wb: 'AG.LND.TOTL.K2', name: 'Land area (sq. km)', unit: 'sq_km' },

  // ===== INFRASTRUCTURE (7) =====
  { section: 'Infrastructure', code: 'RAIL_LINES_TOTAL_KM', wb: 'IS.RRS.TOTL.KM', name: 'Rail lines (total route-km)', unit: 'km' },
  { section: 'Infrastructure', code: 'ROADS_PAVED_PCT', wb: 'IS.ROD.PAVE.ZS', name: 'Roads, paved (% of total roads)', unit: 'percent' },
  { section: 'Infrastructure', code: 'CONTAINER_PORT_TRAFFIC_TEU', wb: 'IS.SHP.GOOD.TU', name: 'Container port traffic (TEU: 20 foot equivalent units)', unit: 'TEU' },
  { section: 'Infrastructure', code: 'AIR_TRANSPORT_DEPARTURES', wb: 'IS.AIR.DPRT', name: 'Air transport, registered carrier departures worldwide', unit: 'count' },
  { section: 'Infrastructure', code: 'AIR_FREIGHT_MILLION_TON_KM', wb: 'IS.AIR.GOOD.MT.K1', name: 'Air transport, freight (million ton-km)', unit: 'million_ton_km' },
  { section: 'Infrastructure', code: 'ELECTRICITY_TRANSMISSION_LOSSES_PCT', wb: 'EG.ELC.LOSS.ZS', name: 'Electric power transmission and distribution losses (% of output)', unit: 'percent' },
  { section: 'Infrastructure', code: 'ELECTRICITY_FROM_OIL_PCT', wb: 'EG.ELC.PETR.ZS', name: 'Electricity production from oil sources (% of total)', unit: 'percent' },

  // ===== DEFENSE (2) =====
  { section: 'Defense', code: 'ARMED_FORCES_PCT_LABOR_FORCE', wb: 'MS.MIL.TOTL.TF.ZS', name: 'Armed forces personnel (% of total labor force)', unit: 'percent' },
  { section: 'Defense', code: 'MILITARY_EXPENDITURE_PCT_GOVT', wb: 'MS.MIL.XPND.ZS', name: 'Military expenditure (% of central government expenditure)', unit: 'percent' },

  // ===== INTERNATIONAL (3) =====
  { section: 'International', code: 'MERCHANDISE_EXPORTS_USD', wb: 'TX.VAL.MRCH.CD.WT', name: 'Merchandise exports (current US$)', unit: 'USD' },
  { section: 'International', code: 'MERCHANDISE_IMPORTS_USD', wb: 'TM.VAL.MRCH.CD.WT', name: 'Merchandise imports (current US$)', unit: 'USD' },
  { section: 'International', code: 'TOTAL_NATURAL_RESOURCE_RENTS_PCT_GDP', wb: 'NY.GDP.TOTL.RT.ZS', name: 'Total natural resources rents (% of GDP)', unit: 'percent' },

  // ===== TECHNOLOGY (2) =====
  { section: 'Technology', code: 'PATENT_APPLICATIONS_NONRESIDENTS', wb: 'IP.PAT.NRES', name: 'Patent applications, nonresidents', unit: 'count' },
  { section: 'Technology', code: 'TRADEMARK_APPLICATIONS_RESIDENTS', wb: 'IP.TMK.RESD', name: 'Trademark applications, direct resident', unit: 'count' },

  // ===== SOCIETY (2) =====
  { section: 'Society', code: 'SUICIDE_MORTALITY_RATE', wb: 'SH.STA.SUIC.P5', name: 'Suicide mortality rate (per 100,000 population)', unit: 'per_100k' },
  { section: 'Society', code: 'CAUSE_OF_DEATH_NONCOMMUNICABLE_PCT', wb: 'SH.DYN.NCOM.ZS', name: 'Cause of death, by non-communicable diseases (% of total)', unit: 'percent' },
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
  console.log('\n=== WorldLore: Geopolitical Indicator Expansion (28 new indicators) ===\n');
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
