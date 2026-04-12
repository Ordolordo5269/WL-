import * as repo from './repo';
import { PrismaClient } from '@prisma/client';
import { SLUG_TO_CODE, toNumberOrNull } from './types';
import type { GdpEntry, IndicatorPoint } from './types';

const prisma = new PrismaClient();

// ── Simple in-module cache ──
type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const BATCH_CACHE_TTL = 5 * 60 * 1000; // 5 min

// ── Core functions (from indicator.service.ts) ──

export async function getLatestIndicatorValueForIso3(iso3: string, indicatorCode: string): Promise<IndicatorPoint> {
  return repo.findLatestIndicator(iso3, indicatorCode);
}

export async function getGdpLatestByIso3(): Promise<Record<string, GdpEntry>> {
  const result = await repo.findAllLatestByCode('GDP_USD');
  console.log(`GDP Service: Found ${Object.keys(result).length} countries with GDP data`);
  return result;
}

export async function getGdpByIso3(iso3: string): Promise<GdpEntry | null> {
  return repo.findByIso3AndCode(iso3, 'GDP_USD');
}

export async function getGdpPerCapitaLatestByIso3(): Promise<Record<string, GdpEntry>> {
  const result = await repo.findAllLatestByCode('GDP_PC_USD');
  console.log(`GDP Per Capita Service: Found ${Object.keys(result).length} countries with GDP per capita data`);
  return result;
}

export async function getGdpPerCapitaByIso3(iso3: string): Promise<GdpEntry | null> {
  return repo.findByIso3AndCode(iso3, 'GDP_PC_USD');
}

export async function getInflationLatestByIso3(): Promise<Record<string, GdpEntry>> {
  const result = await repo.findAllLatestInflation();
  console.log(`Inflation Service: Found ${Object.keys(result).length} countries with inflation data`);
  return result;
}

export async function getInflationByIso3(iso3: string): Promise<GdpEntry | null> {
  return repo.findInflationByIso3(iso3);
}

export async function getIndicatorLatestBySlug(slug: string): Promise<Record<string, GdpEntry>> {
  const indicatorCode = SLUG_TO_CODE[slug.toLowerCase()];
  if (!indicatorCode) {
    console.warn(`Unknown indicator slug: ${slug}`);
    return {};
  }
  const result = await repo.findAllLatestByCode(indicatorCode);
  console.log(`Indicator ${slug} (${indicatorCode}): Found ${Object.keys(result).length} countries with data`);
  return result;
}

export async function getIndicatorTimeSeries(
  iso3: string,
  indicatorCode: string,
  startYear?: number,
  endYear?: number
): Promise<Array<{ year: number; value: number | null }>> {
  return repo.findTimeSeries(iso3, indicatorCode, startYear, endYear);
}

// ── Batch with cache ──

export async function getIndicatorBatch(
  slugs: string[]
): Promise<Record<string, Record<string, { value: number | null; year: number | null }>>> {
  const result: Record<string, Record<string, { value: number | null; year: number | null }>> = {};

  await Promise.all(slugs.map(async (slug) => {
    const cacheKey = `ind:latest:${slug}`;
    const cached = cacheGet<Record<string, { value: number | null; year: number | null }>>(cacheKey);
    if (cached) {
      result[slug] = cached;
      return;
    }
    const data = await getIndicatorLatestBySlug(slug);
    const normalized: Record<string, { value: number | null; year: number | null }> = {};
    for (const [iso3, entry] of Object.entries(data)) {
      normalized[iso3] = { value: entry.value, year: entry.year };
    }
    cacheSet(cacheKey, normalized, BATCH_CACHE_TTL);
    result[slug] = normalized;
  }));

  return result;
}

// ── Section-specific aggregators (from economy/defense/politics controllers) ──

export async function getEconomyData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [gdp, gdpPc, inflation, gini, agr, ind, srv, exp, imp, debt, unemp,
    gdpGrowth, gniPcPpp, govtDebt, taxRevenue, grossSavings, totalReserves, grossCapitalFormation,
    fdiPctGdp, remittancesPctGdp, manufacturing,
    gdpPpp, gdpPcPpp, exchangeRate, laborForce, govtRevenue, govtExpenditure,
    externalDebtPctGni] = await Promise.all([
    getLatestIndicatorValueForIso3(countryIso3, 'GDP_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'GDP_PC_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'INFLATION_CPI_YOY_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'GINI_INDEX'),
    getLatestIndicatorValueForIso3(countryIso3, 'AGRICULTURE_PERCENT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'INDUSTRY_PERCENT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'SERVICES_PERCENT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'EXPORTS_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'IMPORTS_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'EXTERNAL_DEBT_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'UNEMPLOYMENT_RATE_PERCENT'),
    // New expansion indicators
    getLatestIndicatorValueForIso3(countryIso3, 'GDP_GROWTH_ANNUAL_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'GNI_PER_CAPITA_PPP'),
    getLatestIndicatorValueForIso3(countryIso3, 'GOVT_DEBT_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'TAX_REVENUE_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'GROSS_SAVINGS_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'TOTAL_RESERVES_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'GROSS_CAPITAL_FORMATION_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'FDI_NET_INFLOWS_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'REMITTANCES_RECEIVED_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'MANUFACTURING_VALUE_ADDED_PCT_GDP'),
    // Geopolitical expansion
    getLatestIndicatorValueForIso3(countryIso3, 'GDP_PPP_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'GDP_PC_PPP_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'EXCHANGE_RATE_LCU_PER_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'LABOR_FORCE_TOTAL'),
    getLatestIndicatorValueForIso3(countryIso3, 'GOVT_REVENUE_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'GOVT_EXPENDITURE_PCT_GDP'),
    // Final geopolitical
    getLatestIndicatorValueForIso3(countryIso3, 'EXTERNAL_DEBT_PCT_GNI'),
  ]);

  const exportsUsd = toNumberOrNull(exp.value);
  const importsUsd = toNumberOrNull(imp.value);
  const tradeBalance = exportsUsd !== null && importsUsd !== null ? exportsUsd - importsUsd : null;

  return {
    country_id: countryIso3,
    gdp_usd: toNumberOrNull(gdp.value),
    gdp_per_capita_usd: toNumberOrNull(gdpPc.value),
    inflation_rate_percent: toNumberOrNull(inflation.value),
    gini_index: toNumberOrNull(gini.value),
    agriculture_percent: toNumberOrNull(agr.value),
    industry_percent: toNumberOrNull(ind.value),
    services_percent: toNumberOrNull(srv.value),
    exports_usd: exportsUsd,
    imports_usd: importsUsd,
    external_debt_usd: toNumberOrNull(debt.value),
    unemployment_rate_percent: toNumberOrNull(unemp.value),
    country_name: entity.name,
    region: entity.region ?? 'N/A',
    income_level: (entity.props as any)?.incomeLevel ?? 'N/A',
    trade_balance_usd: tradeBalance,
    gdp_year: gdp.year ?? null,
    // New expansion fields
    gdp_growth_annual_pct: toNumberOrNull(gdpGrowth.value),
    gni_per_capita_ppp: toNumberOrNull(gniPcPpp.value),
    govt_debt_pct_gdp: toNumberOrNull(govtDebt.value),
    tax_revenue_pct_gdp: toNumberOrNull(taxRevenue.value),
    gross_savings_pct_gdp: toNumberOrNull(grossSavings.value),
    total_reserves_usd: toNumberOrNull(totalReserves.value),
    gross_capital_formation_pct_gdp: toNumberOrNull(grossCapitalFormation.value),
    fdi_net_inflows_pct_gdp: toNumberOrNull(fdiPctGdp.value),
    remittances_received_pct_gdp: toNumberOrNull(remittancesPctGdp.value),
    manufacturing_pct_gdp: toNumberOrNull(manufacturing.value),
    // Geopolitical expansion
    gdp_ppp_usd: toNumberOrNull(gdpPpp.value),
    gdp_per_capita_ppp_usd: toNumberOrNull(gdpPcPpp.value),
    exchange_rate_lcu_per_usd: toNumberOrNull(exchangeRate.value),
    labor_force_total: toNumberOrNull(laborForce.value),
    govt_revenue_pct_gdp: toNumberOrNull(govtRevenue.value),
    govt_expenditure_pct_gdp: toNumberOrNull(govtExpenditure.value),
    external_debt_pct_gni: toNumberOrNull(externalDebtPctGni.value),
  };
}

export async function getDefenseData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [milPctGdp, milUsd, armedForces, armsImp, armsExp, battleDeaths, pop,
    armedForcesPctLabor, milPctGovt] = await Promise.all([
    getLatestIndicatorValueForIso3(countryIso3, 'MILITARY_EXPENDITURE_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'MILITARY_EXPENDITURE_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'ARMED_FORCES_PERSONNEL_TOTAL'),
    getLatestIndicatorValueForIso3(countryIso3, 'ARMS_IMPORTS_TIV'),
    getLatestIndicatorValueForIso3(countryIso3, 'ARMS_EXPORTS_TIV'),
    getLatestIndicatorValueForIso3(countryIso3, 'BATTLE_RELATED_DEATHS'),
    getLatestIndicatorValueForIso3(countryIso3, 'POPULATION_TOTAL'),
    // Geopolitical expansion
    getLatestIndicatorValueForIso3(countryIso3, 'ARMED_FORCES_PCT_LABOR_FORCE'),
    getLatestIndicatorValueForIso3(countryIso3, 'MILITARY_EXPENDITURE_PCT_GOVT'),
  ]);

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    militaryExpenditurePctGdp: { value: toNumberOrNull(milPctGdp.value), year: milPctGdp.year },
    militaryExpenditureUsd: { value: toNumberOrNull(milUsd.value), year: milUsd.year },
    armedForcesPersonnelTotal: { value: toNumberOrNull(armedForces.value), year: armedForces.year },
    armsImportsTiv: { value: toNumberOrNull(armsImp.value), year: armsImp.year },
    armsExportsTiv: { value: toNumberOrNull(armsExp.value), year: armsExp.year },
    battleRelatedDeaths: { value: toNumberOrNull(battleDeaths.value), year: battleDeaths.year },
    populationTotal: { value: toNumberOrNull(pop.value), year: pop.year },
    armedForcesPctLaborForce: { value: toNumberOrNull(armedForcesPctLabor.value), year: armedForcesPctLabor.year },
    militaryExpenditurePctGovt: { value: toNumberOrNull(milPctGovt.value), year: milPctGovt.year },
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

export async function getPoliticsData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [
    politicalStability, voiceAccountability, govEffectiveness, regulatoryQuality, ruleOfLaw, controlCorruption,
    fhPoliticalRights, fhCivilLiberties, fhFreedomStatus,
    cpiScore, cpiRank,
    fsiTotal, fsiRank,
    vdemPolyarchy, vdemLibdem, vdemFreexp, vdemCleanElections, vdemRuleOfLaw,
    polity5Score,
    gpiScore, gpiRank,
  ] =
    await Promise.all([
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_POLITICAL_STABILITY'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_VOICE_ACCOUNTABILITY'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_GOVERNMENT_EFFECTIVENESS'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_REGULATORY_QUALITY'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_RULE_OF_LAW'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_CONTROL_CORRUPTION'),
      getLatestIndicatorValueForIso3(countryIso3, 'FH_POLITICAL_RIGHTS'),
      getLatestIndicatorValueForIso3(countryIso3, 'FH_CIVIL_LIBERTIES'),
      getLatestIndicatorValueForIso3(countryIso3, 'FH_FREEDOM_STATUS'),
      getLatestIndicatorValueForIso3(countryIso3, 'TI_CPI_SCORE'),
      getLatestIndicatorValueForIso3(countryIso3, 'TI_CPI_RANK'),
      getLatestIndicatorValueForIso3(countryIso3, 'FSI_TOTAL'),
      getLatestIndicatorValueForIso3(countryIso3, 'FSI_RANK'),
      // V-Dem
      getLatestIndicatorValueForIso3(countryIso3, 'VDEM_POLYARCHY'),
      getLatestIndicatorValueForIso3(countryIso3, 'VDEM_LIBDEM'),
      getLatestIndicatorValueForIso3(countryIso3, 'VDEM_FREEXP'),
      getLatestIndicatorValueForIso3(countryIso3, 'VDEM_CLEAN_ELECTIONS'),
      getLatestIndicatorValueForIso3(countryIso3, 'VDEM_RULE_OF_LAW'),
      // Polity5
      getLatestIndicatorValueForIso3(countryIso3, 'POLITY5_SCORE'),
      // GPI
      getLatestIndicatorValueForIso3(countryIso3, 'GPI_SCORE'),
      getLatestIndicatorValueForIso3(countryIso3, 'GPI_RANK'),
    ]);

  // Calculate Democracy Index from Voice & Accountability (VA.EST ranges -2.5 to 2.5 → 0-10)
  let democracyIndexValue: number | null = null;
  const democracyIndexYear: number | null = voiceAccountability.year;
  if (voiceAccountability.value !== null) {
    const normalized = ((voiceAccountability.value + 2.5) / 5) * 10;
    democracyIndexValue = Math.max(0, Math.min(10, Number(normalized.toFixed(2))));
  }

  // Fetch heads of government from existing backend endpoint (Wikidata)
  const base = process.env.API_BASE_URL || 'http://localhost:3001';
  let formOfGovernment: string | null = null;
  let headsOfGovernment: any[] = [];

  try {
    const officesRes = await fetch(`${base}/api/politics/offices/${countryIso3}`);
    if (officesRes.ok) {
      const officesData = await officesRes.json();
      formOfGovernment = officesData.formOfGovernment ?? null;
      headsOfGovernment = Array.isArray(officesData.offices)
        ? officesData.offices.map((o: any) => ({
            title: `${o.officeLabel} — ${o.personLabel}`,
            url: o.personUrl || '',
            role: o.role,
            office: o.officeLabel,
            person: o.personLabel,
          }))
        : [];
    }
  } catch (err) {
    console.warn(`Could not fetch offices for ${countryIso3}:`, err);
  }

  // Freedom status label
  const freedomStatusValue = toNumberOrNull(fhFreedomStatus.value);
  const freedomStatusLabel = freedomStatusValue === 3 ? 'Free' : freedomStatusValue === 2 ? 'Partly Free' : freedomStatusValue === 1 ? 'Not Free' : null;

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    wgiPoliticalStability: { value: toNumberOrNull(politicalStability.value), year: politicalStability.year },
    democracyIndex: { value: democracyIndexValue, year: democracyIndexYear },
    wgiGovernmentEffectiveness: { value: toNumberOrNull(govEffectiveness.value), year: govEffectiveness.year },
    wgiRegulatoryQuality: { value: toNumberOrNull(regulatoryQuality.value), year: regulatoryQuality.year },
    wgiRuleOfLaw: { value: toNumberOrNull(ruleOfLaw.value), year: ruleOfLaw.year },
    wgiControlOfCorruption: { value: toNumberOrNull(controlCorruption.value), year: controlCorruption.year },
    // Freedom House
    freedomHouse: {
      politicalRights: { value: toNumberOrNull(fhPoliticalRights.value), year: fhPoliticalRights.year },
      civilLiberties: { value: toNumberOrNull(fhCivilLiberties.value), year: fhCivilLiberties.year },
      status: { value: freedomStatusLabel, numeric: freedomStatusValue, year: fhFreedomStatus.year },
    },
    // Transparency International CPI
    corruptionIndex: {
      score: { value: toNumberOrNull(cpiScore.value), year: cpiScore.year },
      rank: { value: toNumberOrNull(cpiRank.value), year: cpiRank.year },
    },
    // Fragile States Index
    fragileStatesIndex: {
      score: { value: toNumberOrNull(fsiTotal.value), year: fsiTotal.year },
      rank: { value: toNumberOrNull(fsiRank.value), year: fsiRank.year },
    },
    // V-Dem Democracy Indices
    vdem: {
      electoralDemocracy: { value: toNumberOrNull(vdemPolyarchy.value), year: vdemPolyarchy.year },
      liberalDemocracy: { value: toNumberOrNull(vdemLibdem.value), year: vdemLibdem.year },
      freedomOfExpression: { value: toNumberOrNull(vdemFreexp.value), year: vdemFreexp.year },
      cleanElections: { value: toNumberOrNull(vdemCleanElections.value), year: vdemCleanElections.year },
      ruleOfLaw: { value: toNumberOrNull(vdemRuleOfLaw.value), year: vdemRuleOfLaw.year },
    },
    // Polity5
    polity5: {
      score: { value: toNumberOrNull(polity5Score.value), year: polity5Score.year },
    },
    // Global Peace Index
    globalPeaceIndex: {
      score: { value: toNumberOrNull(gpiScore.value), year: gpiScore.year },
      rank: { value: toNumberOrNull(gpiRank.value), year: gpiRank.year },
    },
    // Sanctions
    sanctions: await (async () => {
      const list = await prisma.sanction.findMany({
        where: { countryIso3: countryIso3, isActive: true },
        orderBy: { listedAt: 'desc' },
        select: { entityName: true, entityType: true, sanctionProgram: true, sanctionAuthority: true, reason: true, listedAt: true },
      });
      return { count: list.length, entities: list };
    })(),
    // Elections
    elections: await (async () => {
      const all = await prisma.electionCalendar.findMany({
        where: { countryIso3: countryIso3 },
        orderBy: { year: 'desc' },
        select: { electionType: true, year: true, electionDate: true, status: true, turnoutPercent: true, description: true },
      });
      return {
        upcoming: all.filter(e => e.status === 'scheduled').slice(0, 5),
        recent: all.filter(e => e.status === 'completed').slice(0, 5),
      };
    })(),
    headsOfGovernment,
    formOfGovernment,
    sources: {
      worldBankWgi: 'https://api.worldbank.org/v2/',
      freedomHouse: 'https://freedomhouse.org',
      transparencyInternational: 'https://www.transparency.org/cpi',
      fundForPeace: 'https://fragilestatesindex.org',
      wikidata: 'https://query.wikidata.org/sparql',
    },
  };
}

// ── Society ──

export async function getSocietyData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [
    lifeExpectancy, literacyRateAdult, povertyExtreme215, uhcServiceCoverageIndex,
    primaryNetEnrollment, populationTotal, populationGrowth, crudeBirthRate,
    crudeDeathRate, urbanPopulationPercent, ruralPopulationPercent, populationDensity,
    youthUnemployment, homicides,
    // Education expansion
    educationExpenditure, secondaryEnrollment, tertiaryEnrollment, pupilTeacherRatio, outOfSchool,
    // Geopolitical expansion
    suicideRate, noncommunicableDeaths
  ] = await Promise.all([
    getLatestIndicatorValueForIso3(countryIso3, 'LIFE_EXPECTANCY'),
    getLatestIndicatorValueForIso3(countryIso3, 'LITERACY_RATE_ADULT'),
    getLatestIndicatorValueForIso3(countryIso3, 'POVERTY_EXTREME_215'),
    getLatestIndicatorValueForIso3(countryIso3, 'UHC_SERVICE_COVERAGE_INDEX'),
    getLatestIndicatorValueForIso3(countryIso3, 'PRIMARY_NET_ENROLLMENT'),
    getLatestIndicatorValueForIso3(countryIso3, 'POPULATION_TOTAL'),
    getLatestIndicatorValueForIso3(countryIso3, 'POPULATION_GROWTH'),
    getLatestIndicatorValueForIso3(countryIso3, 'CRUDE_BIRTH_RATE'),
    getLatestIndicatorValueForIso3(countryIso3, 'CRUDE_DEATH_RATE'),
    getLatestIndicatorValueForIso3(countryIso3, 'URBAN_POPULATION_PERCENT'),
    getLatestIndicatorValueForIso3(countryIso3, 'RURAL_POPULATION_PERCENT'),
    getLatestIndicatorValueForIso3(countryIso3, 'POPULATION_DENSITY'),
    getLatestIndicatorValueForIso3(countryIso3, 'YOUTH_UNEMPLOYMENT_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'INTENTIONAL_HOMICIDES_PER_100K'),
    // Education expansion
    getLatestIndicatorValueForIso3(countryIso3, 'EDUCATION_EXPENDITURE_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'SECONDARY_NET_ENROLLMENT'),
    getLatestIndicatorValueForIso3(countryIso3, 'TERTIARY_GROSS_ENROLLMENT'),
    getLatestIndicatorValueForIso3(countryIso3, 'PRIMARY_PUPIL_TEACHER_RATIO'),
    getLatestIndicatorValueForIso3(countryIso3, 'OUT_OF_SCHOOL_CHILDREN_PRIMARY'),
    // Geopolitical expansion
    getLatestIndicatorValueForIso3(countryIso3, 'SUICIDE_MORTALITY_RATE'),
    getLatestIndicatorValueForIso3(countryIso3, 'CAUSE_OF_DEATH_NONCOMMUNICABLE_PCT'),
  ]);

  return {
    countryCode3: countryIso3,
    lifeExpectancy: { value: toNumberOrNull(lifeExpectancy.value), year: lifeExpectancy.year },
    literacyRateAdult: { value: toNumberOrNull(literacyRateAdult.value), year: literacyRateAdult.year },
    povertyExtreme215: { value: toNumberOrNull(povertyExtreme215.value), year: povertyExtreme215.year },
    uhcServiceCoverageIndex: { value: toNumberOrNull(uhcServiceCoverageIndex.value), year: uhcServiceCoverageIndex.year },
    primaryNetEnrollment: { value: toNumberOrNull(primaryNetEnrollment.value), year: primaryNetEnrollment.year },
    populationTotal: { value: toNumberOrNull(populationTotal.value), year: populationTotal.year },
    populationGrowth: { value: toNumberOrNull(populationGrowth.value), year: populationGrowth.year },
    crudeBirthRate: { value: toNumberOrNull(crudeBirthRate.value), year: crudeBirthRate.year },
    crudeDeathRate: { value: toNumberOrNull(crudeDeathRate.value), year: crudeDeathRate.year },
    urbanPopulationPercent: { value: toNumberOrNull(urbanPopulationPercent.value), year: urbanPopulationPercent.year },
    ruralPopulationPercent: { value: toNumberOrNull(ruralPopulationPercent.value), year: ruralPopulationPercent.year },
    populationDensity: { value: toNumberOrNull(populationDensity.value), year: populationDensity.year },
    youthUnemploymentPct: { value: toNumberOrNull(youthUnemployment.value), year: youthUnemployment.year },
    intentionalHomicidesPer100k: { value: toNumberOrNull(homicides.value), year: homicides.year },
    // Education expansion
    educationExpenditurePctGdp: { value: toNumberOrNull(educationExpenditure.value), year: educationExpenditure.year },
    secondaryNetEnrollment: { value: toNumberOrNull(secondaryEnrollment.value), year: secondaryEnrollment.year },
    tertiaryGrossEnrollment: { value: toNumberOrNull(tertiaryEnrollment.value), year: tertiaryEnrollment.year },
    primaryPupilTeacherRatio: { value: toNumberOrNull(pupilTeacherRatio.value), year: pupilTeacherRatio.year },
    outOfSchoolChildrenPrimary: { value: toNumberOrNull(outOfSchool.value), year: outOfSchool.year },
    // Geopolitical expansion
    suicideMortalityRate: { value: toNumberOrNull(suicideRate.value), year: suicideRate.year },
    causeOfDeathNoncommunicablePct: { value: toNumberOrNull(noncommunicableDeaths.value), year: noncommunicableDeaths.year },
  };
}

// ── Technology ──

export async function getTechnologyData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [rndExpenditurePctGdp, highTechExportsUsd, researchersPerMillion, patentApplicationsResidents, scientificJournalArticles,
    broadband, highTechExportsPctManuf,
    patentNonresidents, trademarks] =
    await Promise.all([
      getLatestIndicatorValueForIso3(countryIso3, 'RND_EXPENDITURE_PCT_GDP'),
      getLatestIndicatorValueForIso3(countryIso3, 'HIGH_TECH_EXPORTS_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'RESEARCHERS_PER_MILLION'),
      getLatestIndicatorValueForIso3(countryIso3, 'PATENT_APPLICATIONS_RESIDENTS'),
      getLatestIndicatorValueForIso3(countryIso3, 'SCIENTIFIC_JOURNAL_ARTICLES'),
      getLatestIndicatorValueForIso3(countryIso3, 'FIXED_BROADBAND_PER_100'),
      getLatestIndicatorValueForIso3(countryIso3, 'HIGH_TECH_EXPORTS_PCT_MANUF'),
      // Geopolitical expansion
      getLatestIndicatorValueForIso3(countryIso3, 'PATENT_APPLICATIONS_NONRESIDENTS'),
      getLatestIndicatorValueForIso3(countryIso3, 'TRADEMARK_APPLICATIONS_RESIDENTS'),
    ]);

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    rndExpenditurePctGdp: { value: toNumberOrNull(rndExpenditurePctGdp.value), year: rndExpenditurePctGdp.year },
    highTechExportsUsd: { value: toNumberOrNull(highTechExportsUsd.value), year: highTechExportsUsd.year },
    researchersPerMillion: { value: toNumberOrNull(researchersPerMillion.value), year: researchersPerMillion.year },
    patentApplicationsResidents: { value: toNumberOrNull(patentApplicationsResidents.value), year: patentApplicationsResidents.year },
    scientificJournalArticles: { value: toNumberOrNull(scientificJournalArticles.value), year: scientificJournalArticles.year },
    fixedBroadbandPer100: { value: toNumberOrNull(broadband.value), year: broadband.year },
    highTechExportsPctManuf: { value: toNumberOrNull(highTechExportsPctManuf.value), year: highTechExportsPctManuf.year },
    patentApplicationsNonresidents: { value: toNumberOrNull(patentNonresidents.value), year: patentNonresidents.year },
    trademarkApplicationsResidents: { value: toNumberOrNull(trademarks.value), year: trademarks.year },
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

// ── International ──

export async function getInternationalData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [odaReceivedUsd, tradePercentGdp, currentAccountUsd, fdiNetInflowsUsd, fdiNetOutflowsUsd, remittancesUsd,
    refugeesByOrigin, refugeesByAsylum, lpi, odaGivenPctGni,
    merchandiseExports, merchandiseImports, naturalResourceRents,
    foodProductionIndex] =
    await Promise.all([
      getLatestIndicatorValueForIso3(countryIso3, 'ODA_RECEIVED_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'TRADE_PERCENT_GDP'),
      getLatestIndicatorValueForIso3(countryIso3, 'CURRENT_ACCOUNT_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'FDI_NET_INFLOWS_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'FDI_NET_OUTFLOWS_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'REMITTANCES_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'REFUGEE_POP_BY_ORIGIN'),
      getLatestIndicatorValueForIso3(countryIso3, 'REFUGEE_POP_BY_ASYLUM'),
      getLatestIndicatorValueForIso3(countryIso3, 'LOGISTICS_PERFORMANCE_INDEX'),
      getLatestIndicatorValueForIso3(countryIso3, 'ODA_GIVEN_PCT_GNI'),
      // Geopolitical expansion
      getLatestIndicatorValueForIso3(countryIso3, 'MERCHANDISE_EXPORTS_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'MERCHANDISE_IMPORTS_USD'),
      getLatestIndicatorValueForIso3(countryIso3, 'TOTAL_NATURAL_RESOURCE_RENTS_PCT_GDP'),
      // Final geopolitical
      getLatestIndicatorValueForIso3(countryIso3, 'FOOD_PRODUCTION_INDEX'),
    ]);

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    odaReceivedUsd: { value: toNumberOrNull(odaReceivedUsd.value), year: odaReceivedUsd.year },
    tradePercentGdp: { value: toNumberOrNull(tradePercentGdp.value), year: tradePercentGdp.year },
    currentAccountUsd: { value: toNumberOrNull(currentAccountUsd.value), year: currentAccountUsd.year },
    fdiNetInflowsUsd: { value: toNumberOrNull(fdiNetInflowsUsd.value), year: fdiNetInflowsUsd.year },
    fdiNetOutflowsUsd: { value: toNumberOrNull(fdiNetOutflowsUsd.value), year: fdiNetOutflowsUsd.year },
    remittancesUsd: { value: toNumberOrNull(remittancesUsd.value), year: remittancesUsd.year },
    refugeePopByOrigin: { value: toNumberOrNull(refugeesByOrigin.value), year: refugeesByOrigin.year },
    refugeePopByAsylum: { value: toNumberOrNull(refugeesByAsylum.value), year: refugeesByAsylum.year },
    logisticsPerformanceIndex: { value: toNumberOrNull(lpi.value), year: lpi.year },
    odaGivenPctGni: { value: toNumberOrNull(odaGivenPctGni.value), year: odaGivenPctGni.year },
    merchandiseExportsUsd: { value: toNumberOrNull(merchandiseExports.value), year: merchandiseExports.year },
    merchandiseImportsUsd: { value: toNumberOrNull(merchandiseImports.value), year: merchandiseImports.year },
    totalNaturalResourceRentsPctGdp: { value: toNumberOrNull(naturalResourceRents.value), year: naturalResourceRents.year },
    foodProductionIndex: { value: toNumberOrNull(foodProductionIndex.value), year: foodProductionIndex.year },
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

// ── Raw Materials / Commodities ──

export async function getCommoditiesData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [
    energyImportsPct, fuelExportsPct, fuelImportsPct, energyUsePerCapita, electricityRenewablesPct,
    mineralRentsPctGdp, oreMetalExportsPct,
    cerealProductionMt, cerealYieldKgHa, foodExportsPct, foodImportsPct, arableLandPct
  ] = await Promise.all([
    // Energy
    getLatestIndicatorValueForIso3(countryIso3, 'ENERGY_IMPORTS_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'FUEL_EXPORTS_PCT_MERCH'),
    getLatestIndicatorValueForIso3(countryIso3, 'FUEL_IMPORTS_PCT_MERCH'),
    getLatestIndicatorValueForIso3(countryIso3, 'ENERGY_USE_KG_OIL_EQ_PC'),
    getLatestIndicatorValueForIso3(countryIso3, 'ELECTRICITY_RENEWABLES_PCT'),
    // Strategic Minerals
    getLatestIndicatorValueForIso3(countryIso3, 'MINERAL_RENTS_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'ORE_METAL_EXPORTS_PCT'),
    // Agriculture
    getLatestIndicatorValueForIso3(countryIso3, 'CEREAL_PRODUCTION_MT'),
    getLatestIndicatorValueForIso3(countryIso3, 'CEREAL_YIELD_KG_HA'),
    getLatestIndicatorValueForIso3(countryIso3, 'FOOD_EXPORTS_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'FOOD_IMPORTS_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'ARABLE_LAND_PCT'),
  ]);

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    // Energy
    energyImportsPct: { value: toNumberOrNull(energyImportsPct.value), year: energyImportsPct.year },
    fuelExportsPct: { value: toNumberOrNull(fuelExportsPct.value), year: fuelExportsPct.year },
    fuelImportsPct: { value: toNumberOrNull(fuelImportsPct.value), year: fuelImportsPct.year },
    energyUsePerCapita: { value: toNumberOrNull(energyUsePerCapita.value), year: energyUsePerCapita.year },
    electricityRenewablesPct: { value: toNumberOrNull(electricityRenewablesPct.value), year: electricityRenewablesPct.year },
    // Strategic Minerals
    mineralRentsPctGdp: { value: toNumberOrNull(mineralRentsPctGdp.value), year: mineralRentsPctGdp.year },
    oreMetalExportsPct: { value: toNumberOrNull(oreMetalExportsPct.value), year: oreMetalExportsPct.year },
    // Agriculture
    cerealProductionMt: { value: toNumberOrNull(cerealProductionMt.value), year: cerealProductionMt.year },
    cerealYieldKgHa: { value: toNumberOrNull(cerealYieldKgHa.value), year: cerealYieldKgHa.year },
    foodExportsPct: { value: toNumberOrNull(foodExportsPct.value), year: foodExportsPct.year },
    foodImportsPct: { value: toNumberOrNull(foodImportsPct.value), year: foodImportsPct.year },
    arableLandPct: { value: toNumberOrNull(arableLandPct.value), year: arableLandPct.year },
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

// ── Environment ──

export async function getEnvironmentData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [
    co2PerCapita, co2TotalKt, forestAreaPct, pm25, renewableEnergy,
    cleanWater, renewableElectricity, co2Electricity, protectedAreas, methane, forestRents,
    ghgTotal, fossilFuel, landArea,
    // Climate Risk & Vulnerability (ND-GAIN, WRI)
    ndGainIndex, ndGainVulnerability, ndGainReadiness,
    wriScore, wriRank,
    // GCP fuel-specific CO2
    co2Coal, co2Oil, co2Gas, co2Cement, co2Flaring, co2Consumption,
  ] = await Promise.all([
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_EMISSIONS_PER_CAPITA'),
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_EMISSIONS_TOTAL_KT'),
    getLatestIndicatorValueForIso3(countryIso3, 'FOREST_AREA_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'PM25_AIR_POLLUTION'),
    getLatestIndicatorValueForIso3(countryIso3, 'RENEWABLE_ENERGY_CONSUMPTION_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'ACCESS_CLEAN_WATER_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'RENEWABLE_ELECTRICITY_OUTPUT_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_FROM_ELECTRICITY_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'TERRESTRIAL_PROTECTED_AREAS_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'METHANE_EMISSIONS_KT_CO2EQ'),
    getLatestIndicatorValueForIso3(countryIso3, 'FOREST_RENTS_PCT_GDP'),
    // Geopolitical expansion
    getLatestIndicatorValueForIso3(countryIso3, 'GHG_EMISSIONS_TOTAL_KT'),
    getLatestIndicatorValueForIso3(countryIso3, 'FOSSIL_FUEL_CONSUMPTION_PCT'),
    getLatestIndicatorValueForIso3(countryIso3, 'LAND_AREA_SQ_KM'),
    // ND-GAIN + WRI (P6 Phase A)
    getLatestIndicatorValueForIso3(countryIso3, 'ND_GAIN_INDEX'),
    getLatestIndicatorValueForIso3(countryIso3, 'ND_GAIN_VULNERABILITY'),
    getLatestIndicatorValueForIso3(countryIso3, 'ND_GAIN_READINESS'),
    getLatestIndicatorValueForIso3(countryIso3, 'WRI_SCORE'),
    getLatestIndicatorValueForIso3(countryIso3, 'WRI_RANK'),
    // Global Carbon Project (P6 Phase A)
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_COAL_MT'),
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_OIL_MT'),
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_GAS_MT'),
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_CEMENT_MT'),
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_FLARING_MT'),
    getLatestIndicatorValueForIso3(countryIso3, 'CO2_CONSUMPTION_MT'),
  ]);

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    // Climate & Emissions
    co2EmissionsPerCapita: { value: toNumberOrNull(co2PerCapita.value), year: co2PerCapita.year },
    co2EmissionsTotalKt: { value: toNumberOrNull(co2TotalKt.value), year: co2TotalKt.year },
    pm25AirPollution: { value: toNumberOrNull(pm25.value), year: pm25.year },
    co2FromElectricityPct: { value: toNumberOrNull(co2Electricity.value), year: co2Electricity.year },
    methaneEmissionsKtCo2eq: { value: toNumberOrNull(methane.value), year: methane.year },
    // Natural Resources
    forestAreaPct: { value: toNumberOrNull(forestAreaPct.value), year: forestAreaPct.year },
    terrestrialProtectedAreasPct: { value: toNumberOrNull(protectedAreas.value), year: protectedAreas.year },
    accessCleanWaterPct: { value: toNumberOrNull(cleanWater.value), year: cleanWater.year },
    forestRentsPctGdp: { value: toNumberOrNull(forestRents.value), year: forestRents.year },
    // Energy Transition
    renewableEnergyConsumptionPct: { value: toNumberOrNull(renewableEnergy.value), year: renewableEnergy.year },
    renewableElectricityOutputPct: { value: toNumberOrNull(renewableElectricity.value), year: renewableElectricity.year },
    // Geopolitical expansion
    ghgEmissionsTotalKt: { value: toNumberOrNull(ghgTotal.value), year: ghgTotal.year },
    fossilFuelConsumptionPct: { value: toNumberOrNull(fossilFuel.value), year: fossilFuel.year },
    landAreaSqKm: { value: toNumberOrNull(landArea.value), year: landArea.year },
    // P6 Phase A: Climate Risk & Vulnerability
    ndGain: {
      index: { value: toNumberOrNull(ndGainIndex.value), year: ndGainIndex.year },
      vulnerability: { value: toNumberOrNull(ndGainVulnerability.value), year: ndGainVulnerability.year },
      readiness: { value: toNumberOrNull(ndGainReadiness.value), year: ndGainReadiness.year },
    },
    worldRiskIndex: {
      score: { value: toNumberOrNull(wriScore.value), year: wriScore.year },
      rank: { value: toNumberOrNull(wriRank.value), year: wriRank.year },
    },
    // P6 Phase A: CO2 by fuel source (GCP)
    co2BySource: {
      coal: { value: toNumberOrNull(co2Coal.value), year: co2Coal.year },
      oil: { value: toNumberOrNull(co2Oil.value), year: co2Oil.year },
      gas: { value: toNumberOrNull(co2Gas.value), year: co2Gas.year },
      cement: { value: toNumberOrNull(co2Cement.value), year: co2Cement.year },
      flaring: { value: toNumberOrNull(co2Flaring.value), year: co2Flaring.year },
      consumption: { value: toNumberOrNull(co2Consumption.value), year: co2Consumption.year },
    },
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

// ── Health ──

export async function getHealthData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [healthExpPctGdp, physicians, hospitalBeds, infantMortality, maternalMortality, immunizationMeasles, undernourishment] =
    await Promise.all([
      getLatestIndicatorValueForIso3(countryIso3, 'HEALTH_EXPENDITURE_PCT_GDP'),
      getLatestIndicatorValueForIso3(countryIso3, 'PHYSICIANS_PER_1000'),
      getLatestIndicatorValueForIso3(countryIso3, 'HOSPITAL_BEDS_PER_1000'),
      getLatestIndicatorValueForIso3(countryIso3, 'MORTALITY_RATE_INFANT'),
      getLatestIndicatorValueForIso3(countryIso3, 'MORTALITY_RATE_MATERNAL'),
      getLatestIndicatorValueForIso3(countryIso3, 'IMMUNIZATION_MEASLES'),
      getLatestIndicatorValueForIso3(countryIso3, 'PREVALENCE_OF_UNDERNOURISHMENT'),
    ]);

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    healthExpenditurePctGdp: { value: toNumberOrNull(healthExpPctGdp.value), year: healthExpPctGdp.year },
    physiciansPerThousand: { value: toNumberOrNull(physicians.value), year: physicians.year },
    hospitalBedsPerThousand: { value: toNumberOrNull(hospitalBeds.value), year: hospitalBeds.year },
    infantMortalityRate: { value: toNumberOrNull(infantMortality.value), year: infantMortality.year },
    maternalMortalityRatio: { value: toNumberOrNull(maternalMortality.value), year: maternalMortality.year },
    immunizationMeasles: { value: toNumberOrNull(immunizationMeasles.value), year: immunizationMeasles.year },
    undernourishmentPct: { value: toNumberOrNull(undernourishment.value), year: undernourishment.year },
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

// ── Infrastructure & Connectivity ──

export async function getInfrastructureData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [internetUsers, mobileSubscriptions, accessElectricity, airTransport, secureServers,
    railLines, roadsPaved, containerPort, airDepartures, airFreight, electricityLosses, electricityFromOil] =
    await Promise.all([
      getLatestIndicatorValueForIso3(countryIso3, 'INTERNET_USERS'),
      getLatestIndicatorValueForIso3(countryIso3, 'MOBILE_CELLULAR_SUBSCRIPTIONS'),
      getLatestIndicatorValueForIso3(countryIso3, 'ACCESS_TO_ELECTRICITY'),
      getLatestIndicatorValueForIso3(countryIso3, 'AIR_TRANSPORT_PASSENGERS'),
      getLatestIndicatorValueForIso3(countryIso3, 'SECURE_INTERNET_SERVERS_PER_MILLION'),
      // Geopolitical expansion
      getLatestIndicatorValueForIso3(countryIso3, 'RAIL_LINES_TOTAL_KM'),
      getLatestIndicatorValueForIso3(countryIso3, 'ROADS_PAVED_PCT'),
      getLatestIndicatorValueForIso3(countryIso3, 'CONTAINER_PORT_TRAFFIC_TEU'),
      getLatestIndicatorValueForIso3(countryIso3, 'AIR_TRANSPORT_DEPARTURES'),
      getLatestIndicatorValueForIso3(countryIso3, 'AIR_FREIGHT_MILLION_TON_KM'),
      getLatestIndicatorValueForIso3(countryIso3, 'ELECTRICITY_TRANSMISSION_LOSSES_PCT'),
      getLatestIndicatorValueForIso3(countryIso3, 'ELECTRICITY_FROM_OIL_PCT'),
    ]);

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    internetUsersPct: { value: toNumberOrNull(internetUsers.value), year: internetUsers.year },
    mobileCellularPer100: { value: toNumberOrNull(mobileSubscriptions.value), year: mobileSubscriptions.year },
    accessElectricityPct: { value: toNumberOrNull(accessElectricity.value), year: accessElectricity.year },
    airTransportPassengers: { value: toNumberOrNull(airTransport.value), year: airTransport.year },
    secureInternetServersPm: { value: toNumberOrNull(secureServers.value), year: secureServers.year },
    // Geopolitical expansion
    railLinesTotalKm: { value: toNumberOrNull(railLines.value), year: railLines.year },
    roadsPavedPct: { value: toNumberOrNull(roadsPaved.value), year: roadsPaved.year },
    containerPortTrafficTeu: { value: toNumberOrNull(containerPort.value), year: containerPort.year },
    airTransportDepartures: { value: toNumberOrNull(airDepartures.value), year: airDepartures.year },
    airFreightMillionTonKm: { value: toNumberOrNull(airFreight.value), year: airFreight.year },
    electricityTransmissionLossesPct: { value: toNumberOrNull(electricityLosses.value), year: electricityLosses.year },
    electricityFromOilPct: { value: toNumberOrNull(electricityFromOil.value), year: electricityFromOil.year },
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

// ── World Bank Series (raw indicator code) ──

export async function getWorldBankSeriesData(
  iso3: string,
  indicatorCode: string,
  limitYears?: number
): Promise<Array<{ year: number; value: number | null }>> {
  return repo.findSeriesByRawCode(iso3, indicatorCode, limitYears);
}
