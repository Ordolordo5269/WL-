/**
 * WorldLore: Indicator Expansion Ingestion
 *
 * Ingests 33 new World Bank indicators across 3 tiers:
 * - Tier 1 (16): Economy (7) + Environment (7) + Society (2)
 * - Tier 2 (10): International (4) + Technology (2) + Economy (2) + Environment (2)
 * - Tier 3 (8): Economy (1) + Society (2) + Politics (1) + Raw Materials (4)
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
  // ===== TIER 1: HIGH PRIORITY =====

  // Economy (7 new)
  { section: 'Economy', code: 'GOVT_DEBT_PCT_GDP', wb: 'GC.DOD.TOTL.GD.ZS', name: 'Central government debt, total (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'TAX_REVENUE_PCT_GDP', wb: 'GC.TAX.TOTL.GD.ZS', name: 'Tax revenue (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'GROSS_SAVINGS_PCT_GDP', wb: 'NY.GNS.ICTR.ZS', name: 'Gross savings (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'TOTAL_RESERVES_USD', wb: 'FI.RES.TOTL.CD', name: 'Total reserves (includes gold, current US$)', unit: 'USD' },
  { section: 'Economy', code: 'GROSS_CAPITAL_FORMATION_PCT_GDP', wb: 'NE.GDI.TOTL.ZS', name: 'Gross capital formation (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'GDP_GROWTH_ANNUAL_PCT', wb: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)', unit: 'percent' },
  { section: 'Economy', code: 'GNI_PER_CAPITA_PPP', wb: 'NY.GNP.PCAP.PP.CD', name: 'GNI per capita, PPP (current international $)', unit: 'intl_dollar' },

  // Environment (7 new)
  { section: 'Environment', code: 'CO2_EMISSIONS_PER_CAPITA', wb: 'EN.ATM.CO2E.PC', name: 'CO2 emissions (metric tons per capita)', unit: 'metric_tons' },
  { section: 'Environment', code: 'CO2_EMISSIONS_TOTAL_KT', wb: 'EN.ATM.CO2E.KT', name: 'CO2 emissions (kt)', unit: 'kt' },
  { section: 'Environment', code: 'FOREST_AREA_PCT', wb: 'AG.LND.FRST.ZS', name: 'Forest area (% of land area)', unit: 'percent' },
  { section: 'Environment', code: 'PM25_AIR_POLLUTION', wb: 'EN.ATM.PM25.MC.M3', name: 'PM2.5 air pollution, mean annual exposure (micrograms per cubic meter)', unit: 'ug_m3' },
  { section: 'Environment', code: 'RENEWABLE_ENERGY_CONSUMPTION_PCT', wb: 'EG.FEC.RNEW.ZS', name: 'Renewable energy consumption (% of total final energy consumption)', unit: 'percent' },
  { section: 'Environment', code: 'ACCESS_CLEAN_WATER_PCT', wb: 'SH.H2O.SMDW.ZS', name: 'People using safely managed drinking water services (% of population)', unit: 'percent' },
  { section: 'Environment', code: 'RENEWABLE_ELECTRICITY_OUTPUT_PCT', wb: 'EG.ELC.RNEW.ZS', name: 'Renewable electricity output (% of total electricity output)', unit: 'percent' },

  // Society (1 new — Women in Parliament already exists)
  { section: 'Society', code: 'YOUTH_UNEMPLOYMENT_PCT', wb: 'SL.UEM.1524.ZS', name: 'Unemployment, youth total (% of total labor force ages 15-24)', unit: 'percent' },

  // ===== TIER 2: MEDIUM PRIORITY =====

  // International (4 new)
  { section: 'International', code: 'REFUGEE_POP_BY_ORIGIN', wb: 'SM.POP.REFG.OR', name: 'Refugee population by country or territory of origin', unit: 'people' },
  { section: 'International', code: 'REFUGEE_POP_BY_ASYLUM', wb: 'SM.POP.REFG', name: 'Refugee population by country or territory of asylum', unit: 'people' },
  { section: 'International', code: 'LOGISTICS_PERFORMANCE_INDEX', wb: 'LP.LPI.OVRL.XQ', name: 'Logistics performance index: Overall (1=low to 5=high)', unit: 'index' },
  { section: 'International', code: 'ODA_GIVEN_PCT_GNI', wb: 'DC.ODA.TOTL.GN.ZS', name: 'Net ODA provided, total (% of GNI)', unit: 'percent' },

  // Technology (2 new — R&D already exists)
  { section: 'Technology', code: 'FIXED_BROADBAND_PER_100', wb: 'IT.NET.BBND.P2', name: 'Fixed broadband subscriptions (per 100 people)', unit: 'per_100' },
  { section: 'Technology', code: 'HIGH_TECH_EXPORTS_PCT_MANUF', wb: 'TX.VAL.TECH.MF.ZS', name: 'High-technology exports (% of manufactured exports)', unit: 'percent' },

  // Economy (2 new)
  { section: 'Economy', code: 'FDI_NET_INFLOWS_PCT_GDP', wb: 'BX.KLT.DINV.WD.GD.ZS', name: 'Foreign direct investment, net inflows (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'REMITTANCES_RECEIVED_PCT_GDP', wb: 'BX.TRF.PWKR.DT.GD.ZS', name: 'Personal remittances, received (% of GDP)', unit: 'percent' },

  // Environment (2 new)
  { section: 'Environment', code: 'CO2_FROM_ELECTRICITY_PCT', wb: 'EN.CO2.ETOT.ZS', name: 'CO2 emissions from electricity and heat production, total (% of total fuel combustion)', unit: 'percent' },
  { section: 'Environment', code: 'TERRESTRIAL_PROTECTED_AREAS_PCT', wb: 'ER.LND.PTLD.ZS', name: 'Terrestrial protected areas (% of total land area)', unit: 'percent' },

  // ===== TIER 3: NICE TO HAVE =====

  // Economy (1 new — Industry, Services, Agriculture already exist)
  { section: 'Economy', code: 'MANUFACTURING_VALUE_ADDED_PCT_GDP', wb: 'NV.IND.MANF.ZS', name: 'Manufacturing, value added (% of GDP)', unit: 'percent' },

  // Society (1 new — Net migration already exists)
  { section: 'Society', code: 'INTENTIONAL_HOMICIDES_PER_100K', wb: 'VC.IHR.PSRC.P5', name: 'Intentional homicides (per 100,000 people)', unit: 'per_100k' },

  // Politics (1 new)
  { section: 'Politics', code: 'STATISTICAL_CAPACITY', wb: 'IQ.SCI.OVRL', name: 'Statistical Capacity score (Overall average)', unit: 'index' },

  // Raw Materials (4 new)
  { section: 'Raw Materials', code: 'ELECTRIC_POWER_CONSUMPTION_KWH_PC', wb: 'EG.USE.ELEC.KH.PC', name: 'Electric power consumption (kWh per capita)', unit: 'kWh' },
  { section: 'Raw Materials', code: 'NATURAL_GAS_RENTS_PCT_GDP', wb: 'NY.GDP.NGAS.RT.ZS', name: 'Natural gas rents (% of GDP)', unit: 'percent' },
  { section: 'Raw Materials', code: 'OIL_RENTS_PCT_GDP', wb: 'NY.GDP.PETR.RT.ZS', name: 'Oil rents (% of GDP)', unit: 'percent' },
  { section: 'Raw Materials', code: 'FOREST_RENTS_PCT_GDP', wb: 'NY.GDP.FRST.RT.ZS', name: 'Forest rents (% of GDP)', unit: 'percent' },

  // Environment (1 new)
  { section: 'Environment', code: 'METHANE_EMISSIONS_KT_CO2EQ', wb: 'EN.ATM.METH.KT.CE', name: 'Methane emissions (kt of CO2 equivalent)', unit: 'kt' },
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
  console.log('\n=== WorldLore: Indicator Expansion Ingestion (33 new indicators) ===\n');
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
