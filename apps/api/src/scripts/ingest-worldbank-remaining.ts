/**
 * Bulk ingestion for the 74 remaining indicators NOT covered by ingest-worldbank-all-sections.ts.
 * These are mostly Society sub-indicators (health, education, demographics, labor, poverty).
 * Uses the same fast bulk SQL INSERT ON CONFLICT pattern.
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

const REMAINING_INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string | null; section: string }> = [
  // Demographics
  { section: 'Society', code: 'LIFE_EXPECTANCY_FEMALE', wb: 'SP.DYN.LE00.FE.IN', name: 'Life expectancy at birth, female (years)', unit: 'years' },
  { section: 'Society', code: 'LIFE_EXPECTANCY_MALE', wb: 'SP.DYN.LE00.MA.IN', name: 'Life expectancy at birth, male (years)', unit: 'years' },
  { section: 'Society', code: 'FERTILITY_RATE_TOTAL', wb: 'SP.DYN.TFRT.IN', name: 'Fertility rate, total (births per woman)', unit: 'births_per_woman' },
  { section: 'Society', code: 'ADOLESCENT_FERTILITY_RATE', wb: 'SP.ADO.TFRT', name: 'Adolescent fertility rate (births per 1,000 women ages 15-19)', unit: 'per_1000' },
  { section: 'Society', code: 'POPULATION_AGES_0_14_PERCENT', wb: 'SP.POP.0014.TO.ZS', name: 'Population ages 0-14 (% of total)', unit: 'percent' },
  { section: 'Society', code: 'POPULATION_AGES_15_64_PERCENT', wb: 'SP.POP.1564.TO.ZS', name: 'Population ages 15-64 (% of total)', unit: 'percent' },
  { section: 'Society', code: 'POPULATION_AGES_65_UP_PERCENT', wb: 'SP.POP.65UP.TO.ZS', name: 'Population ages 65 and above (% of total)', unit: 'percent' },
  { section: 'Society', code: 'POPULATION_FEMALE_PERCENT', wb: 'SP.POP.TOTL.FE.ZS', name: 'Population, female (% of total)', unit: 'percent' },
  { section: 'Society', code: 'POPULATION_MALE_PERCENT', wb: 'SP.POP.TOTL.MA.ZS', name: 'Population, male (% of total)', unit: 'percent' },
  { section: 'Society', code: 'URBAN_POPULATION_GROWTH', wb: 'SP.URB.GROW', name: 'Urban population growth (annual %)', unit: 'percent' },
  { section: 'Society', code: 'MIGRATION_NET', wb: 'SM.POP.NETM', name: 'Net migration', unit: 'people' },

  // Mortality
  { section: 'Society', code: 'MORTALITY_RATE_INFANT', wb: 'SP.DYN.IMRT.IN', name: 'Mortality rate, infant (per 1,000 live births)', unit: 'per_1000' },
  { section: 'Society', code: 'MORTALITY_RATE_UNDER5', wb: 'SH.DYN.MORT', name: 'Mortality rate, under-5 (per 1,000 live births)', unit: 'per_1000' },
  { section: 'Society', code: 'MORTALITY_RATE_NEONATAL', wb: 'SH.DYN.NMRT', name: 'Mortality rate, neonatal (per 1,000 live births)', unit: 'per_1000' },
  { section: 'Society', code: 'MORTALITY_RATE_MATERNAL', wb: 'SH.STA.MMRT', name: 'Maternal mortality ratio (per 100,000 live births)', unit: 'per_100000' },

  // Health
  { section: 'Society', code: 'HEALTH_EXPENDITURE_PCT_GDP', wb: 'SH.XPD.CHEX.GD.ZS', name: 'Current health expenditure (% of GDP)', unit: 'percent' },
  { section: 'Society', code: 'HEALTH_EXPENDITURE_PC_USD', wb: 'SH.XPD.CHEX.PC.CD', name: 'Current health expenditure per capita (current US$)', unit: 'USD' },
  { section: 'Society', code: 'PHYSICIANS_PER_1000', wb: 'SH.MED.PHYS.ZS', name: 'Physicians (per 1,000 people)', unit: 'per_1000' },
  { section: 'Society', code: 'HOSPITAL_BEDS_PER_1000', wb: 'SH.MED.BEDS.ZS', name: 'Hospital beds (per 1,000 people)', unit: 'per_1000' },
  { section: 'Society', code: 'NURSES_AND_MIDWIVES_PER_1000', wb: 'SH.MED.NUMW.P3', name: 'Nurses and midwives (per 1,000 people)', unit: 'per_1000' },
  { section: 'Society', code: 'IMMUNIZATION_DPT', wb: 'SH.IMM.IDPT', name: 'Immunization, DPT (% of children ages 12-23 months)', unit: 'percent' },
  { section: 'Society', code: 'IMMUNIZATION_MEASLES', wb: 'SH.IMM.MEAS', name: 'Immunization, measles (% of children ages 12-23 months)', unit: 'percent' },
  { section: 'Society', code: 'IMMUNIZATION_HEPATITIS_B', wb: 'SH.IMM.HEPB', name: 'Immunization, HepB3 (% of one-year-old children)', unit: 'percent' },
  { section: 'Society', code: 'PREVALENCE_OF_HIV_TOTAL', wb: 'SH.DYN.AIDS.ZS', name: 'Prevalence of HIV, total (% of population ages 15-49)', unit: 'percent' },
  { section: 'Society', code: 'INCIDENCE_OF_TUBERCULOSIS', wb: 'SH.TBS.INCD', name: 'Incidence of tuberculosis (per 100,000 people)', unit: 'per_100000' },
  { section: 'Society', code: 'PREVALENCE_OF_UNDERNOURISHMENT', wb: 'SN.ITK.DEFC.ZS', name: 'Prevalence of undernourishment (% of population)', unit: 'percent' },
  { section: 'Society', code: 'PREVALENCE_OF_STUNTING_HEIGHT_FOR_AGE', wb: 'SH.STA.STNT.ZS', name: 'Prevalence of stunting, height for age (% of children under 5)', unit: 'percent' },
  { section: 'Society', code: 'PREVALENCE_OF_WASTING_WEIGHT_FOR_HEIGHT', wb: 'SH.STA.WAST.ZS', name: 'Prevalence of wasting, weight for height (% of children under 5)', unit: 'percent' },
  { section: 'Society', code: 'PREVALENCE_OF_OVERWEIGHT', wb: 'SH.STA.OWGH.ZS', name: 'Prevalence of overweight (% of children under 5)', unit: 'percent' },
  { section: 'Society', code: 'BIRTHS_ATTENDED_BY_SKILLED_HEALTH_STAFF', wb: 'SH.STA.BRTC.ZS', name: 'Births attended by skilled health staff (% of total)', unit: 'percent' },
  { section: 'Society', code: 'ANTENATAL_CARE_COVERAGE_AT_LEAST_4_VISITS', wb: 'SH.STA.ANV4.ZS', name: 'Antenatal care, at least 4 visits (%)', unit: 'percent' },
  { section: 'Society', code: 'ACCESS_TO_IMPROVED_WATER', wb: 'SH.H2O.BASW.ZS', name: 'People using basic drinking water services (%)', unit: 'percent' },
  { section: 'Society', code: 'ACCESS_TO_IMPROVED_SANITATION', wb: 'SH.STA.BASS.ZS', name: 'People using basic sanitation services (%)', unit: 'percent' },
  { section: 'Society', code: 'UHC_SERVICE_COVERAGE_INDEX', wb: 'SH.UHC.SRVS.CV.XD', name: 'UHC service coverage index', unit: 'index' },

  // Education
  { section: 'Society', code: 'LITERACY_RATE_ADULT_FEMALE', wb: 'SE.ADT.LITR.FE.ZS', name: 'Literacy rate, adult female (%)', unit: 'percent' },
  { section: 'Society', code: 'LITERACY_RATE_ADULT_MALE', wb: 'SE.ADT.LITR.MA.ZS', name: 'Literacy rate, adult male (%)', unit: 'percent' },
  { section: 'Society', code: 'LITERACY_RATE_YOUTH', wb: 'SE.ADT.1524.LT.ZS', name: 'Literacy rate, youth total (%)', unit: 'percent' },
  { section: 'Society', code: 'LITERACY_RATE_YOUTH_FEMALE', wb: 'SE.ADT.1524.LT.FE.ZS', name: 'Literacy rate, youth female (%)', unit: 'percent' },
  { section: 'Society', code: 'LITERACY_RATE_YOUTH_MALE', wb: 'SE.ADT.1524.LT.MA.ZS', name: 'Literacy rate, youth male (%)', unit: 'percent' },
  { section: 'Society', code: 'PRIMARY_GROSS_ENROLLMENT', wb: 'SE.PRM.ENRR', name: 'School enrollment, primary (% gross)', unit: 'percent' },
  { section: 'Society', code: 'SECONDARY_GROSS_ENROLLMENT', wb: 'SE.SEC.ENRR', name: 'School enrollment, secondary (% gross)', unit: 'percent' },
  { section: 'Society', code: 'SECONDARY_NET_ENROLLMENT', wb: 'SE.SEC.NENR', name: 'School enrollment, secondary (% net)', unit: 'percent' },
  { section: 'Society', code: 'TERTIARY_GROSS_ENROLLMENT', wb: 'SE.TER.ENRR', name: 'School enrollment, tertiary (% gross)', unit: 'percent' },
  { section: 'Society', code: 'EDUCATION_EXPENDITURE_PCT_GDP', wb: 'SE.XPD.TOTL.GD.ZS', name: 'Govt expenditure on education (% of GDP)', unit: 'percent' },
  { section: 'Society', code: 'EDUCATION_EXPENDITURE_PCT_GOVT', wb: 'SE.XPD.TOTL.GB.ZS', name: 'Govt expenditure on education (% of govt expenditure)', unit: 'percent' },
  { section: 'Society', code: 'PRIMARY_PUPIL_TEACHER_RATIO', wb: 'SE.PRM.ENRL.TC.ZS', name: 'Pupil-teacher ratio, primary', unit: 'ratio' },
  { section: 'Society', code: 'SECONDARY_PUPIL_TEACHER_RATIO', wb: 'SE.SEC.ENRL.TC.ZS', name: 'Pupil-teacher ratio, secondary', unit: 'ratio' },
  { section: 'Society', code: 'PRIMARY_COMPLETION_RATE', wb: 'SE.PRM.CMPT.ZS', name: 'Primary completion rate, total (%)', unit: 'percent' },
  { section: 'Society', code: 'PRIMARY_COMPLETION_RATE_FEMALE', wb: 'SE.PRM.CMPT.FE.ZS', name: 'Primary completion rate, female (%)', unit: 'percent' },
  { section: 'Society', code: 'PRIMARY_COMPLETION_RATE_MALE', wb: 'SE.PRM.CMPT.MA.ZS', name: 'Primary completion rate, male (%)', unit: 'percent' },
  { section: 'Society', code: 'LOWER_SECONDARY_COMPLETION_RATE', wb: 'SE.SEC.CMPT.LO.ZS', name: 'Lower secondary completion rate (%)', unit: 'percent' },
  { section: 'Society', code: 'OUT_OF_SCHOOL_CHILDREN_PRIMARY', wb: 'SE.PRM.UNER', name: 'Children out of school, primary', unit: 'people' },
  { section: 'Society', code: 'OUT_OF_SCHOOL_CHILDREN_PRIMARY_FEMALE', wb: 'SE.PRM.UNER.FE', name: 'Children out of school, primary, female', unit: 'people' },
  { section: 'Society', code: 'OUT_OF_SCHOOL_CHILDREN_PRIMARY_MALE', wb: 'SE.PRM.UNER.MA', name: 'Children out of school, primary, male', unit: 'people' },

  // Poverty & Inequality
  { section: 'Society', code: 'POVERTY_365', wb: 'SI.POV.LMIC', name: 'Poverty headcount ratio at $3.65 a day (%)', unit: 'percent' },
  { section: 'Society', code: 'POVERTY_685', wb: 'SI.POV.UMIC', name: 'Poverty headcount ratio at $6.85 a day (%)', unit: 'percent' },
  { section: 'Society', code: 'POVERTY_GAP_215', wb: 'SI.POV.GAPS', name: 'Poverty gap at $2.15 a day (%)', unit: 'percent' },
  { section: 'Society', code: 'POVERTY_SEVERITY_INDEX', wb: 'SI.POV.2DAY', name: 'Poverty severity index at $2.15 a day', unit: 'index' },
  { section: 'Society', code: 'SHARE_OF_INCOME_BOTTOM_20_PERCENT', wb: 'SI.DST.FRST.20', name: 'Income share held by lowest 20%', unit: 'percent' },
  { section: 'Society', code: 'SHARE_OF_INCOME_TOP_20_PERCENT', wb: 'SI.DST.05TH.20', name: 'Income share held by highest 20%', unit: 'percent' },
  { section: 'Society', code: 'SHARE_OF_INCOME_TOP_10_PERCENT', wb: 'SI.DST.10TH.10', name: 'Income share held by highest 10%', unit: 'percent' },

  // Labor
  { section: 'Society', code: 'LABOR_FORCE_PARTICIPATION_FEMALE', wb: 'SL.TLF.CACT.FE.ZS', name: 'Labor force participation rate, female (%)', unit: 'percent' },
  { section: 'Society', code: 'LABOR_FORCE_PARTICIPATION_MALE', wb: 'SL.TLF.CACT.MA.ZS', name: 'Labor force participation rate, male (%)', unit: 'percent' },
  { section: 'Society', code: 'EMPLOYMENT_TO_POPULATION_RATIO_FEMALE', wb: 'SL.EMP.TOTL.SP.FE.ZS', name: 'Employment to population ratio, female (%)', unit: 'percent' },
  { section: 'Society', code: 'EMPLOYMENT_TO_POPULATION_RATIO_MALE', wb: 'SL.EMP.TOTL.SP.MA.ZS', name: 'Employment to population ratio, male (%)', unit: 'percent' },
  { section: 'Society', code: 'UNEMPLOYMENT_FEMALE', wb: 'SL.UEM.TOTL.FE.ZS', name: 'Unemployment, female (%)', unit: 'percent' },
  { section: 'Society', code: 'UNEMPLOYMENT_MALE', wb: 'SL.UEM.TOTL.MA.ZS', name: 'Unemployment, male (%)', unit: 'percent' },
  { section: 'Society', code: 'WOMEN_IN_PARLIAMENT', wb: 'SG.GEN.PARL.ZS', name: 'Women in national parliaments (%)', unit: 'percent' },

  // Infrastructure / ICT
  { section: 'Society', code: 'ACCESS_TO_ELECTRICITY', wb: 'EG.ELC.ACCS.ZS', name: 'Access to electricity (% of population)', unit: 'percent' },
  { section: 'Society', code: 'ACCESS_TO_ELECTRICITY_RURAL', wb: 'EG.ELC.ACCS.RU.ZS', name: 'Access to electricity, rural (%)', unit: 'percent' },
  { section: 'Society', code: 'ACCESS_TO_ELECTRICITY_URBAN', wb: 'EG.ELC.ACCS.UR.ZS', name: 'Access to electricity, urban (%)', unit: 'percent' },
  { section: 'Society', code: 'INTERNET_USERS', wb: 'IT.NET.USER.ZS', name: 'Individuals using the Internet (%)', unit: 'percent' },
  { section: 'Society', code: 'MOBILE_CELLULAR_SUBSCRIPTIONS', wb: 'IT.CEL.SETS.P2', name: 'Mobile cellular subscriptions (per 100 people)', unit: 'per_100' },
  { section: 'Society', code: 'FIXED_TELEPHONE_SUBSCRIPTIONS', wb: 'IT.MLT.MAIN.P2', name: 'Fixed telephone subscriptions (per 100 people)', unit: 'per_100' },
];

async function ensureIndicators() {
  console.log('Ensuring indicators exist...');
  for (const it of REMAINING_INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.section, unit: it.unit ?? undefined, source: 'World Bank' },
      update: { name: it.name, topic: it.section, unit: it.unit ?? undefined, source: 'World Bank' }
    });
  }
  console.log(`  ${REMAINING_INDICATORS.length} indicators ensured`);
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
  console.log('\n=== WorldLore: Remaining Indicators Ingestion (Bulk SQL) ===\n');
  console.log(`Target year: ${TARGET_LATEST_YEAR}`);
  console.log(`Total indicators: ${REMAINING_INDICATORS.length}`);
  console.log(`Strategy: Bulk fetch + bulk SQL INSERT ON CONFLICT\n`);

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
  console.log(`Loaded ${Object.keys(iso3ToEntityId).length} unique country entities\n`);

  let totalUpserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < REMAINING_INDICATORS.length; i++) {
    const it = REMAINING_INDICATORS[i];
    const t0 = Date.now();
    console.log(`[${i + 1}/${REMAINING_INDICATORS.length}] ${it.code} (${it.wb})`);

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
        const targetYearPoint = points.find(p => p.year === TARGET_LATEST_YEAR);

        if (!targetYearPoint) {
          upsertRows.push({
            id: randomUUID(), entityId, indicatorCode: it.code, year: TARGET_LATEST_YEAR,
            value: latest.value, source: 'World Bank',
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

  console.log('\n=== Ingestion Complete ===');
  console.log(`Total upserted records: ${totalUpserted}`);
  console.log(`Errors: ${totalErrors}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
