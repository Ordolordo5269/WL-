import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

type SeriesPoint = { date: string; value: number | null };

const INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string | null }> = [
  // ===== INDICADORES ESENCIALES (12 originales del controlador) =====
  { code: 'LIFE_EXPECTANCY', wb: 'SP.DYN.LE00.IN', name: 'Life expectancy at birth, total (years)', unit: 'years' },
  { code: 'LITERACY_RATE_ADULT', wb: 'SE.ADT.LITR.ZS', name: 'Literacy rate, adult total (% of people ages 15 and above)', unit: 'percent' },
  { code: 'POVERTY_EXTREME_215', wb: 'SI.POV.DDAY', name: 'Poverty headcount ratio at $2.15 a day (2017 PPP) (% of population)', unit: 'percent' },
  { code: 'UHC_SERVICE_COVERAGE_INDEX', wb: 'SH.UHC.SRVS.CV.XD', name: 'UHC service coverage index', unit: 'index' },
  { code: 'PRIMARY_NET_ENROLLMENT', wb: 'SE.PRM.NENR', name: 'School enrollment, primary (% net)', unit: 'percent' },
  { code: 'POPULATION_TOTAL', wb: 'SP.POP.TOTL', name: 'Population, total', unit: 'people' },
  { code: 'POPULATION_GROWTH', wb: 'SP.POP.GROW', name: 'Population growth (annual %)', unit: 'percent' },
  { code: 'CRUDE_BIRTH_RATE', wb: 'SP.DYN.CBRT.IN', name: 'Birth rate, crude (per 1,000 people)', unit: 'per_1000' },
  { code: 'CRUDE_DEATH_RATE', wb: 'SP.DYN.CDRT.IN', name: 'Death rate, crude (per 1,000 people)', unit: 'per_1000' },
  { code: 'URBAN_POPULATION_PERCENT', wb: 'SP.URB.TOTL.IN.ZS', name: 'Urban population (% of total population)', unit: 'percent' },
  { code: 'RURAL_POPULATION_PERCENT', wb: 'SP.RUR.TOTL.ZS', name: 'Rural population (% of total population)', unit: 'percent' },
  { code: 'POPULATION_DENSITY', wb: 'SP.POP.DNST', name: 'Population density (people per sq. km of land area)', unit: 'per_sq_km' },

  // ===== INDICADORES ADICIONALES IMPORTANTES =====
  { code: 'LIFE_EXPECTANCY_FEMALE', wb: 'SP.DYN.LE00.FE.IN', name: 'Life expectancy at birth, female (years)', unit: 'years' },
  { code: 'LIFE_EXPECTANCY_MALE', wb: 'SP.DYN.LE00.MA.IN', name: 'Life expectancy at birth, male (years)', unit: 'years' },
  { code: 'MORTALITY_RATE_INFANT', wb: 'SP.DYN.IMRT.IN', name: 'Mortality rate, infant (per 1,000 live births)', unit: 'per_1000' },
  { code: 'FERTILITY_RATE_TOTAL', wb: 'SP.DYN.TFRT.IN', name: 'Fertility rate, total (births per woman)', unit: 'births_per_woman' },
  { code: 'HEALTH_EXPENDITURE_PCT_GDP', wb: 'SH.XPD.CHEX.GD.ZS', name: 'Current health expenditure (% of GDP)', unit: 'percent' },
  { code: 'SECONDARY_GROSS_ENROLLMENT', wb: 'SE.SEC.ENRR', name: 'School enrollment, secondary (% gross)', unit: 'percent' },
  { code: 'ACCESS_TO_ELECTRICITY', wb: 'EG.ELC.ACCS.ZS', name: 'Access to electricity (% of population)', unit: 'percent' },
  { code: 'INTERNET_USERS', wb: 'IT.NET.USER.ZS', name: 'Individuals using the Internet (% of population)', unit: 'percent' }
];

async function ensureIndicators() {
  console.log('Ensuring Society indicators exist in database...');
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: {
        code: it.code,
        name: it.name,
        topic: 'Society',
        unit: it.unit ?? undefined,
        source: 'World Bank'
      },
      update: {
        name: it.name,
        unit: it.unit ?? undefined,
        source: 'World Bank'
      }
    });
  }
  console.log(`✓ ${INDICATORS.length} Society indicators ensured in database`);
}

async function fetchSeriesIso3(iso3: string, wbIndicator: string): Promise<SeriesPoint[]> {
  const url = `${WB_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(wbIndicator)}?format=json&per_page=20000`;
  const { data } = await axios.get(url);
  const rows: any[] = Array.isArray(data?.[1]) ? data[1] : [];
  return rows.map(r => ({ date: r.date, value: r.value }));
}

function findLatestWithFallback(points: SeriesPoint[]): { year: number | null; value: number | null } {
  for (const p of points) {
    const year = parseInt(p.date, 10);
    if (!isNaN(year) && p.value != null) {
      return { year, value: p.value };
    }
  }
  return { year: null, value: null };
}

async function upsertSeries(entityId: string, indicatorCode: string, points: SeriesPoint[]) {
  for (const p of points) {
    const year = parseInt(p.date, 10);
    if (isNaN(year)) continue;
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode, year } },
      update: { value: p.value != null ? new Prisma.Decimal(p.value) : null, source: 'World Bank' },
      create: { entityId, indicatorCode, year, value: p.value != null ? new Prisma.Decimal(p.value) : null, source: 'World Bank' }
    });
  }

  // Ensure target latest year
  const target = points.find(p => parseInt(p.date, 10) === TARGET_LATEST_YEAR);
  const latest = findLatestWithFallback(points);
  if (target && target.value != null) {
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode, year: TARGET_LATEST_YEAR } },
      update: { value: new Prisma.Decimal(target.value), source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: TARGET_LATEST_YEAR, fallback: false } as any },
      create: { entityId, indicatorCode, year: TARGET_LATEST_YEAR, value: new Prisma.Decimal(target.value), source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: TARGET_LATEST_YEAR, fallback: false } as any }
    });
  } else if (latest.year != null) {
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode, year: TARGET_LATEST_YEAR } },
      update: { value: latest.value != null ? new Prisma.Decimal(latest.value) : null, source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true } as any },
      create: { entityId, indicatorCode, year: TARGET_LATEST_YEAR, value: latest.value != null ? new Prisma.Decimal(latest.value) : null, source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true } as any }
    });
  }
}

async function enrichCountryMeta() {
  // Store income level in props.incomeLevel if available from WB metadata
  console.log('Enriching country metadata...');
  const perPage = 2000;
  const url = `${WB_BASE}/country?format=json&per_page=${perPage}`;
  const { data } = await axios.get(url);
  const countries: any[] = Array.isArray(data?.[1]) ? data[1] : [];
  let updated = 0;
  for (const c of countries) {
    const iso3: string = c?.id;
    const name: string = c?.name;
    const regionValue: string | undefined = c?.region?.value;
    const incomeLevel: string | undefined = c?.incomeLevel?.value;
    if (!iso3 || iso3.length !== 3) continue;
    const entity = await prisma.entity.findFirst({ where: { type: 'COUNTRY', iso3 } });
    if (!entity) continue;
    const currentProps = (entity.props as any) || {};
    const nextProps = { ...currentProps, incomeLevel };
    await prisma.entity.update({
      where: { id: entity.id },
      data: {
        name: name ?? entity.name,
        region: regionValue ?? entity.region,
        props: nextProps
      } as any
    });
    updated++;
  }
  console.log(`✓ Updated metadata for ${updated} countries`);
}

async function main() {
  console.log('\n=== WorldLore: Society Indicators Ingestion ===\n');
  console.log(`Target year: ${TARGET_LATEST_YEAR}`);
  console.log(`Total indicators: ${INDICATORS.length}\n`);

  await ensureIndicators();
  await enrichCountryMeta();

  // Lista de 193 países miembros de la ONU (excluyendo Vatican City)
  const unMemberStates = [
    'AFG', 'ALB', 'DZA', 'AND', 'AGO', 'ATG', 'ARG', 'ARM', 'AUS', 'AUT',
    'AZE', 'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BEL', 'BLZ', 'BEN', 'BTN',
    'BOL', 'BIH', 'BWA', 'BRA', 'BRN', 'BGR', 'BFA', 'BDI', 'CPV', 'KHM',
    'CMR', 'CAN', 'CAF', 'TCD', 'CHL', 'CHN', 'COL', 'COM', 'COG', 'CRI',
    'CIV', 'HRV', 'CUB', 'CYP', 'CZE', 'PRK', 'COD', 'DNK', 'DJI', 'DMA',
    'DOM', 'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'EST', 'SWZ', 'ETH', 'FJI',
    'FIN', 'FRA', 'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GRC', 'GRD', 'GTM',
    'GIN', 'GNB', 'GUY', 'HTI', 'HND', 'HUN', 'ISL', 'IND', 'IDN', 'IRN',
    'IRQ', 'IRL', 'ISR', 'ITA', 'JAM', 'JPN', 'JOR', 'KAZ', 'KEN', 'KIR',
    'KWT', 'KGZ', 'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LIE', 'LTU',
    'LUX', 'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MLT', 'MHL', 'MRT', 'MUS',
    'MEX', 'FSM', 'MDA', 'MCO', 'MNG', 'MNE', 'MAR', 'MOZ', 'MMR', 'NAM',
    'NRU', 'NPL', 'NLD', 'NZL', 'NIC', 'NER', 'NGA', 'MKD', 'NOR', 'OMN',
    'PAK', 'PLW', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'POL', 'PRT', 'QAT',
    'KOR', 'ROU', 'RUS', 'RWA', 'KNA', 'LCA', 'VCT', 'WSM', 'SMR', 'STP',
    'SAU', 'SEN', 'SRB', 'SYC', 'SLE', 'SGP', 'SVK', 'SVN', 'SLB', 'SOM',
    'ZAF', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SWE', 'CHE', 'SYR', 'TJK',
    'TZA', 'THA', 'TLS', 'TGO', 'TON', 'TTO', 'TUN', 'TUR', 'TKM', 'TUV',
    'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'URY', 'UZB', 'VUT', 'VEN', 'VNM',
    'YEM', 'ZMB', 'ZWE'
  ];

  const unMemberSet = new Set(unMemberStates.map(iso => iso.toUpperCase()));

  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, slug: true }
  });

  // Filtrar solo países miembros de la ONU
  const unEntities = entities.filter(e => {
    const iso3 = (e.iso3 as string)?.toUpperCase();
    return iso3 && unMemberSet.has(iso3);
  });

  console.log(`\nProcessing ${unEntities.length} UN member countries (of ${entities.length} total countries)...\n`);

  let totalProcessed = 0;
  let totalErrors = 0;

  for (const e of unEntities) {
    const iso3 = e.iso3 as string;
    
    console.log(`[${totalProcessed + 1}/${unEntities.length}] ${e.slug.toUpperCase()} (${iso3})`);
    
    for (const it of INDICATORS) {
      try {
        const series = await fetchSeriesIso3(iso3, it.wb);
        await upsertSeries(e.id, it.code, series);
        const dataPoints = series.filter(p => p.value !== null).length;
        if (dataPoints > 0) {
          console.log(`  ✓ ${it.code.padEnd(35)} → ${dataPoints.toString().padStart(4)} points`);
        } else {
          console.log(`  ○ ${it.code.padEnd(35)} → no data`);
        }
      } catch (err) {
        totalErrors++;
        console.log(`  ✗ ${it.code.padEnd(35)} → ERROR: ${(err as Error).message}`);
      }
    }
    
    totalProcessed++;
    console.log('');
  }

  console.log('\n=== Ingestion Complete ===');
  console.log(`Countries processed: ${totalProcessed}`);
  console.log(`Total indicators: ${INDICATORS.length}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('\nSociety data is now available via:');
  console.log('  /api/society/:iso3');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

