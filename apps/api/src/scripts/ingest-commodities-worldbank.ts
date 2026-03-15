import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

// Raw Materials / Commodities indicators
const COMMODITY_INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string | null; section: string }> = [
  // ===== ENERGY (5) =====
  { section: 'Raw Materials', code: 'ENERGY_IMPORTS_PCT',           wb: 'EG.IMP.CONS.ZS',     name: 'Energy imports, net (% of energy use)',              unit: 'percent' },
  { section: 'Raw Materials', code: 'FUEL_EXPORTS_PCT_MERCH',      wb: 'TX.VAL.FUEL.ZS.UN',  name: 'Fuel exports (% of merchandise exports)',            unit: 'percent' },
  { section: 'Raw Materials', code: 'FUEL_IMPORTS_PCT_MERCH',      wb: 'TM.VAL.FUEL.ZS.UN',  name: 'Fuel imports (% of merchandise imports)',            unit: 'percent' },
  { section: 'Raw Materials', code: 'ENERGY_USE_KG_OIL_EQ_PC',    wb: 'EG.USE.PCAP.KG.OE',  name: 'Energy use (kg of oil equivalent per capita)',       unit: 'kg_oil_eq' },
  { section: 'Raw Materials', code: 'ELECTRICITY_RENEWABLES_PCT',  wb: 'EG.ELC.RNWX.ZS',     name: 'Renewable electricity output (% of total)',          unit: 'percent' },

  // ===== STRATEGIC MINERALS (2) =====
  { section: 'Raw Materials', code: 'MINERAL_RENTS_PCT_GDP',       wb: 'NY.GDP.MINR.RT.ZS',  name: 'Mineral rents (% of GDP)',                           unit: 'percent' },
  { section: 'Raw Materials', code: 'ORE_METAL_EXPORTS_PCT',       wb: 'TX.VAL.MMTL.ZS.UN',  name: 'Ores and metals exports (% of merchandise exports)', unit: 'percent' },

  // ===== AGRICULTURE (5) =====
  { section: 'Raw Materials', code: 'CEREAL_PRODUCTION_MT',        wb: 'AG.PRD.CREL.MT',     name: 'Cereal production (metric tons)',                    unit: 'metric_tons' },
  { section: 'Raw Materials', code: 'CEREAL_YIELD_KG_HA',          wb: 'AG.YLD.CREL.KG',     name: 'Cereal yield (kg per hectare)',                      unit: 'kg_per_ha' },
  { section: 'Raw Materials', code: 'FOOD_EXPORTS_PCT',            wb: 'TX.VAL.FOOD.ZS.UN',  name: 'Food exports (% of merchandise exports)',            unit: 'percent' },
  { section: 'Raw Materials', code: 'FOOD_IMPORTS_PCT',            wb: 'TM.VAL.FOOD.ZS.UN',  name: 'Food imports (% of merchandise imports)',            unit: 'percent' },
  { section: 'Raw Materials', code: 'ARABLE_LAND_PCT',             wb: 'AG.LND.ARBL.ZS',     name: 'Arable land (% of land area)',                      unit: 'percent' },
];

async function ensureIndicators() {
  console.log('Ensuring all commodity indicators exist in database...');
  for (const it of COMMODITY_INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: {
        code: it.code,
        name: it.name,
        topic: it.section,
        unit: it.unit ?? undefined,
        source: 'World Bank'
      },
      update: {
        name: it.name,
        topic: it.section,
        unit: it.unit ?? undefined,
        source: 'World Bank'
      }
    });
  }
  console.log(`  ${COMMODITY_INDICATORS.length} commodity indicators ensured in database`);
}

// Fetch ALL countries for a single indicator in one API call
async function fetchBulkIndicator(wbCode: string): Promise<Array<{ iso3: string; year: number; value: number }>> {
  const url = `${WB_BASE}/country/all/indicator/${encodeURIComponent(wbCode)}?format=json&per_page=20000`;
  const { data } = await axios.get(url);
  const rows: any[] = Array.isArray(data?.[1]) ? data[1] : [];
  const results: Array<{ iso3: string; year: number; value: number }> = [];

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

  return results;
}

async function main() {
  console.log('\n=== WorldLore: Raw Materials / Commodities Indicator Ingestion (Bulk) ===\n');
  console.log(`Target year: ${TARGET_LATEST_YEAR}`);
  console.log(`Total indicators: ${COMMODITY_INDICATORS.length}`);
  console.log('Strategy: Bulk fetch (1 API call per indicator, 12 total)\n');

  await ensureIndicators();

  // Build iso3 -> entityId lookup
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true }
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) {
    iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  }
  console.log(`Loaded ${entities.length} country entities\n`);

  let totalUpserted = 0;
  let totalErrors = 0;

  for (const it of COMMODITY_INDICATORS) {
    console.log(`[${COMMODITY_INDICATORS.indexOf(it) + 1}/${COMMODITY_INDICATORS.length}] ${it.code} (${it.wb})`);

    try {
      const rows = await fetchBulkIndicator(it.wb);
      console.log(`  Fetched ${rows.length} data points from World Bank`);

      // Group by iso3 to find latest per country
      const byIso3 = new Map<string, Array<{ year: number; value: number }>>();
      for (const r of rows) {
        if (!iso3ToEntityId[r.iso3]) continue; // skip if no matching entity
        if (!byIso3.has(r.iso3)) byIso3.set(r.iso3, []);
        byIso3.get(r.iso3)!.push({ year: r.year, value: r.value });
      }

      let countryCount = 0;

      for (const [iso3, points] of byIso3) {
        const entityId = iso3ToEntityId[iso3];
        if (!entityId) continue;

        // Sort by year desc to find latest
        points.sort((a, b) => b.year - a.year);
        const latest = points[0];

        // Upsert latest value at the actual year
        await prisma.indicatorValue.upsert({
          where: { entityId_indicatorCode_year: { entityId, indicatorCode: it.code, year: latest.year } },
          update: { value: new Prisma.Decimal(latest.value), source: 'World Bank' },
          create: { entityId, indicatorCode: it.code, year: latest.year, value: new Prisma.Decimal(latest.value), source: 'World Bank' }
        });

        // Also upsert at TARGET_LATEST_YEAR for consistent lookups
        const targetYearPoint = points.find(p => p.year === TARGET_LATEST_YEAR);
        const fallbackValue = targetYearPoint ? targetYearPoint.value : latest.value;
        const fallbackYear = targetYearPoint ? TARGET_LATEST_YEAR : latest.year;

        await prisma.indicatorValue.upsert({
          where: { entityId_indicatorCode_year: { entityId, indicatorCode: it.code, year: TARGET_LATEST_YEAR } },
          update: {
            value: new Prisma.Decimal(fallbackValue),
            source: 'World Bank',
            meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: fallbackYear, fallback: !targetYearPoint } as any
          },
          create: {
            entityId,
            indicatorCode: it.code,
            year: TARGET_LATEST_YEAR,
            value: new Prisma.Decimal(fallbackValue),
            source: 'World Bank',
            meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: fallbackYear, fallback: !targetYearPoint } as any
          }
        });

        countryCount++;
        totalUpserted += 2;
      }

      console.log(`  Upserted data for ${countryCount} countries`);
    } catch (err) {
      totalErrors++;
      console.log(`  ERROR: ${(err as Error).message}`);
    }

    console.log('');
  }

  console.log('\n=== Ingestion Complete ===');
  console.log(`Total upserted records: ${totalUpserted}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('\nYou can now use: GET /api/commodities/:iso3');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
