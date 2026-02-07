import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

type SeriesPoint = { date: string; value: number | null };

// Complete list of all indicators across all sections
const ALL_INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string | null; section: string }> = [
  // ===== ECONOMY (11) - Already in DB but included for completeness =====
  { section: 'Economy', code: 'GDP_USD', wb: 'NY.GDP.MKTP.CD', name: 'GDP (current US$)', unit: 'USD' },
  { section: 'Economy', code: 'GDP_PC_USD', wb: 'NY.GDP.PCAP.CD', name: 'GDP per capita (current US$)', unit: 'USD' },
  { section: 'Economy', code: 'INFLATION_CPI_YOY_PCT', wb: 'FP.CPI.TOTL.ZG', name: 'Inflation, consumer prices (annual %)', unit: 'percent' },
  { section: 'Economy', code: 'GINI_INDEX', wb: 'SI.POV.GINI', name: 'GINI Index', unit: null },
  { section: 'Economy', code: 'AGRICULTURE_PERCENT_GDP', wb: 'NV.AGR.TOTL.ZS', name: 'Agriculture, value added (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'INDUSTRY_PERCENT_GDP', wb: 'NV.IND.TOTL.ZS', name: 'Industry, value added (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'SERVICES_PERCENT_GDP', wb: 'NV.SRV.TOTL.ZS', name: 'Services, value added (% of GDP)', unit: 'percent' },
  { section: 'Economy', code: 'EXPORTS_USD', wb: 'NE.EXP.GNFS.CD', name: 'Exports of goods and services (current US$)', unit: 'USD' },
  { section: 'Economy', code: 'IMPORTS_USD', wb: 'NE.IMP.GNFS.CD', name: 'Imports of goods and services (current US$)', unit: 'USD' },
  { section: 'Economy', code: 'EXTERNAL_DEBT_USD', wb: 'DT.DOD.DECT.CD', name: 'External debt stocks, total (DOD, current US$)', unit: 'USD' },
  { section: 'Economy', code: 'UNEMPLOYMENT_RATE_PERCENT', wb: 'SL.UEM.TOTL.ZS', name: 'Unemployment, total (% of total labor force)', unit: 'percent' },

  // ===== POLITICS (6) - WGI Indicators =====
  { section: 'Politics', code: 'WGI_POLITICAL_STABILITY', wb: 'PV.EST', name: 'Political Stability and Absence of Violence/Terrorism', unit: 'index' },
  { section: 'Politics', code: 'WGI_VOICE_ACCOUNTABILITY', wb: 'VA.EST', name: 'Voice and Accountability', unit: 'index' },
  { section: 'Politics', code: 'WGI_GOVERNMENT_EFFECTIVENESS', wb: 'GE.EST', name: 'Government Effectiveness', unit: 'index' },
  { section: 'Politics', code: 'WGI_REGULATORY_QUALITY', wb: 'RQ.EST', name: 'Regulatory Quality', unit: 'index' },
  { section: 'Politics', code: 'WGI_RULE_OF_LAW', wb: 'RL.EST', name: 'Rule of Law', unit: 'index' },
  { section: 'Politics', code: 'WGI_CONTROL_CORRUPTION', wb: 'CC.EST', name: 'Control of Corruption', unit: 'index' },

  // ===== SOCIETY (12) =====
  { section: 'Society', code: 'LIFE_EXPECTANCY', wb: 'SP.DYN.LE00.IN', name: 'Life expectancy at birth, total (years)', unit: 'years' },
  { section: 'Society', code: 'LITERACY_RATE_ADULT', wb: 'SE.ADT.LITR.ZS', name: 'Literacy rate, adult total (% of people ages 15 and above)', unit: 'percent' },
  { section: 'Society', code: 'POVERTY_EXTREME_215', wb: 'SI.POV.DDAY', name: 'Poverty headcount ratio at $2.15 a day (2017 PPP) (% of population)', unit: 'percent' },
  { section: 'Society', code: 'UHC_SERVICE_COVERAGE_INDEX', wb: 'SH.UHC.SRVS.CV.XD', name: 'UHC service coverage index', unit: 'index' },
  { section: 'Society', code: 'PRIMARY_NET_ENROLLMENT', wb: 'SE.PRM.NENR', name: 'School enrollment, primary (% net)', unit: 'percent' },
  { section: 'Society', code: 'POPULATION_TOTAL', wb: 'SP.POP.TOTL', name: 'Population, total', unit: 'people' },
  { section: 'Society', code: 'POPULATION_GROWTH', wb: 'SP.POP.GROW', name: 'Population growth (annual %)', unit: 'percent' },
  { section: 'Society', code: 'CRUDE_BIRTH_RATE', wb: 'SP.DYN.CBRT.IN', name: 'Birth rate, crude (per 1,000 people)', unit: 'per_1000' },
  { section: 'Society', code: 'CRUDE_DEATH_RATE', wb: 'SP.DYN.CDRT.IN', name: 'Death rate, crude (per 1,000 people)', unit: 'per_1000' },
  { section: 'Society', code: 'URBAN_POPULATION_PERCENT', wb: 'SP.URB.TOTL.IN.ZS', name: 'Urban population (% of total population)', unit: 'percent' },
  { section: 'Society', code: 'RURAL_POPULATION_PERCENT', wb: 'SP.RUR.TOTL.ZS', name: 'Rural population (% of total population)', unit: 'percent' },
  { section: 'Society', code: 'POPULATION_DENSITY', wb: 'SP.POP.DNST', name: 'Population density (people per sq. km of land area)', unit: 'per_sq_km' },

  // ===== TECHNOLOGY (5) =====
  { section: 'Technology', code: 'RND_EXPENDITURE_PCT_GDP', wb: 'GB.XPD.RSDV.GD.ZS', name: 'Research and development expenditure (% of GDP)', unit: 'percent' },
  { section: 'Technology', code: 'HIGH_TECH_EXPORTS_USD', wb: 'TX.VAL.TECH.CD', name: 'High-technology exports (current US$)', unit: 'USD' },
  { section: 'Technology', code: 'RESEARCHERS_PER_MILLION', wb: 'SP.POP.SCIE.RD.P6', name: 'Researchers in R&D (per million people)', unit: 'per_million' },
  { section: 'Technology', code: 'PATENT_APPLICATIONS_RESIDENTS', wb: 'IP.PAT.RESD', name: 'Patent applications, residents', unit: 'count' },
  { section: 'Technology', code: 'SCIENTIFIC_JOURNAL_ARTICLES', wb: 'IP.JRN.ARTC.SC', name: 'Scientific and technical journal articles', unit: 'count' },

  // ===== DEFENSE (7) =====
  { section: 'Defense', code: 'MILITARY_EXPENDITURE_PCT_GDP', wb: 'MS.MIL.XPND.GD.ZS', name: 'Military expenditure (% of GDP)', unit: 'percent' },
  { section: 'Defense', code: 'MILITARY_EXPENDITURE_USD', wb: 'MS.MIL.XPND.CD', name: 'Military expenditure (current US$)', unit: 'USD' },
  { section: 'Defense', code: 'ARMED_FORCES_PERSONNEL_TOTAL', wb: 'MS.MIL.TOTL.P1', name: 'Armed forces personnel, total', unit: 'people' },
  { section: 'Defense', code: 'ARMS_IMPORTS_TIV', wb: 'MS.MIL.MPRT.KD', name: 'Arms imports (SIPRI trend indicator values)', unit: 'TIV' },
  { section: 'Defense', code: 'ARMS_EXPORTS_TIV', wb: 'MS.MIL.XPRT.KD', name: 'Arms exports (SIPRI trend indicator values)', unit: 'TIV' },
  { section: 'Defense', code: 'BATTLE_RELATED_DEATHS', wb: 'VC.BTL.DETH', name: 'Battle-related deaths (number of people)', unit: 'people' },
  // Note: POPULATION_TOTAL already defined in Society section

  // ===== INTERNATIONAL (6) =====
  { section: 'International', code: 'ODA_RECEIVED_USD', wb: 'DT.ODA.ALLD.CD', name: 'Net official development assistance received (current US$)', unit: 'USD' },
  { section: 'International', code: 'TRADE_PERCENT_GDP', wb: 'NE.TRD.GNFS.ZS', name: 'Trade (% of GDP)', unit: 'percent' },
  { section: 'International', code: 'CURRENT_ACCOUNT_USD', wb: 'BN.CAB.XOKA.CD', name: 'Current account balance (BoP, current US$)', unit: 'USD' },
  { section: 'International', code: 'FDI_NET_INFLOWS_USD', wb: 'BX.KLT.DINV.CD.WD', name: 'Foreign direct investment, net inflows (BoP, current US$)', unit: 'USD' },
  { section: 'International', code: 'FDI_NET_OUTFLOWS_USD', wb: 'BM.KLT.DINV.CD.WD', name: 'Foreign direct investment, net outflows (BoP, current US$)', unit: 'USD' },
  { section: 'International', code: 'REMITTANCES_USD', wb: 'BX.TRF.PWKR.CD.DT', name: 'Personal remittances, received (current US$)', unit: 'USD' }
];

async function ensureIndicators() {
  console.log('Ensuring all indicators exist in database...');
  for (const it of ALL_INDICATORS) {
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
  console.log(`✓ ${ALL_INDICATORS.length} indicators ensured in database`);
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
  console.log('\n=== WorldLore: Complete Indicator Ingestion ===\n');
  console.log(`Target year: ${TARGET_LATEST_YEAR}`);
  console.log(`Total indicators: ${ALL_INDICATORS.length}`);
  console.log('Sections: Economy, Politics, Society, Technology, Defense, International\n');

  await ensureIndicators();
  await enrichCountryMeta();

  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, slug: true }
  });

  console.log(`\nProcessing ${entities.length} countries...\n`);

  let totalProcessed = 0;
  let totalErrors = 0;

  for (const e of entities) {
    const iso3 = e.iso3 as string;
    console.log(`[${totalProcessed + 1}/${entities.length}] ${e.slug.toUpperCase()} (${iso3})`);
    
    for (const it of ALL_INDICATORS) {
      try {
        const series = await fetchSeriesIso3(iso3, it.wb);
        await upsertSeries(e.id, it.code, series);
        const dataPoints = series.filter(p => p.value !== null).length;
        if (dataPoints > 0) {
          console.log(`  ✓ ${it.section.padEnd(14)} ${it.code.padEnd(35)} → ${dataPoints.toString().padStart(4)} points`);
        } else {
          console.log(`  ○ ${it.section.padEnd(14)} ${it.code.padEnd(35)} → no data`);
        }
      } catch (err) {
        totalErrors++;
        console.log(`  ✗ ${it.section.padEnd(14)} ${it.code.padEnd(35)} → ERROR: ${(err as Error).message}`);
      }
    }
    
    totalProcessed++;
    console.log('');
  }

  console.log('\n=== Ingestion Complete ===');
  console.log(`Countries processed: ${totalProcessed}`);
  console.log(`Total indicators: ${ALL_INDICATORS.length}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('\nYou can now use the aggregated endpoints:');
  console.log('  /api/politics/:iso3');
  console.log('  /api/society/:iso3');
  console.log('  /api/technology/:iso3');
  console.log('  /api/defense/:iso3');
  console.log('  /api/international/:iso3');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });













