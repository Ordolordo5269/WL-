import * as repo from './repo';
import { SLUG_TO_CODE, toNumberOrNull } from './types';
import type { GdpEntry, IndicatorPoint } from './types';

// ── Simple in-module cache (replaces core/cache/memoryCache) ──
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

  const [gdp, gdpPc, inflation, gini, agr, ind, srv, exp, imp, debt, unemp] = await Promise.all([
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
  };
}

export async function getDefenseData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [milPctGdp, milUsd, armedForces, armsImp, armsExp, battleDeaths, pop] = await Promise.all([
    getLatestIndicatorValueForIso3(countryIso3, 'MILITARY_EXPENDITURE_PCT_GDP'),
    getLatestIndicatorValueForIso3(countryIso3, 'MILITARY_EXPENDITURE_USD'),
    getLatestIndicatorValueForIso3(countryIso3, 'ARMED_FORCES_PERSONNEL_TOTAL'),
    getLatestIndicatorValueForIso3(countryIso3, 'ARMS_IMPORTS_TIV'),
    getLatestIndicatorValueForIso3(countryIso3, 'ARMS_EXPORTS_TIV'),
    getLatestIndicatorValueForIso3(countryIso3, 'BATTLE_RELATED_DEATHS'),
    getLatestIndicatorValueForIso3(countryIso3, 'POPULATION_TOTAL'),
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
    sources: { worldBank: 'https://api.worldbank.org/v2/' },
  };
}

export async function getPoliticsData(iso3: string) {
  const entity = await repo.findCountryEntity(iso3);
  if (!entity) return null;

  const countryIso3 = entity.iso3 as string;

  const [politicalStability, voiceAccountability, govEffectiveness, regulatoryQuality, ruleOfLaw, controlCorruption] =
    await Promise.all([
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_POLITICAL_STABILITY'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_VOICE_ACCOUNTABILITY'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_GOVERNMENT_EFFECTIVENESS'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_REGULATORY_QUALITY'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_RULE_OF_LAW'),
      getLatestIndicatorValueForIso3(countryIso3, 'WGI_CONTROL_CORRUPTION'),
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

  return {
    countryCode3: countryIso3,
    countryName: entity.name,
    wgiPoliticalStability: { value: toNumberOrNull(politicalStability.value), year: politicalStability.year },
    democracyIndex: { value: democracyIndexValue, year: democracyIndexYear },
    wgiGovernmentEffectiveness: { value: toNumberOrNull(govEffectiveness.value), year: govEffectiveness.year },
    wgiRegulatoryQuality: { value: toNumberOrNull(regulatoryQuality.value), year: regulatoryQuality.year },
    wgiRuleOfLaw: { value: toNumberOrNull(ruleOfLaw.value), year: ruleOfLaw.year },
    wgiControlOfCorruption: { value: toNumberOrNull(controlCorruption.value), year: controlCorruption.year },
    headsOfGovernment,
    formOfGovernment,
    sources: {
      worldBankWgi: 'https://api.worldbank.org/v2/',
      wikidata: 'https://query.wikidata.org/sparql',
    },
  };
}
