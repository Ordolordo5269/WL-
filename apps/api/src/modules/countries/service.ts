import { getAllCountries, searchCountries, getCountryByCode, getCountryBasicInfo } from '../../services/country.service';
import { CountryBasicInfoResponse, CountrySearchResponse } from '../../types/country.types';
import * as repo from './repo.js';
import type { CountryOverview, RiskLevel } from './types.js';

export async function listAllCountries(): Promise<CountrySearchResponse> {
  return getAllCountries();
}

export async function findCountriesByName(query: string): Promise<CountrySearchResponse> {
  return searchCountries(query);
}

export async function getCountryByIsoCode(code: string): Promise<CountryBasicInfoResponse> {
  return getCountryByCode(code);
}

export async function getCountryBasicInfoByName(name: string): Promise<CountryBasicInfoResponse> {
  return getCountryBasicInfo(name);
}

function calculateRiskLevel(conflictCount: number): RiskLevel {
  if (conflictCount === 0) return 'low';
  if (conflictCount <= 2) return 'medium';
  if (conflictCount <= 4) return 'high';
  return 'critical';
}

export async function getOverview(iso3: string): Promise<CountryOverview | null> {
  const entity = await repo.findByIso3(iso3);
  if (!entity) return null;

  const [conflictCount, indicators] = await Promise.all([
    repo.countConflictsByIso3(iso3),
    repo.findLatestIndicators(entity.id),
  ]);

  const indicatorMap = new Map(
    indicators.map((iv) => [iv.indicatorCode, iv.value ? Number(iv.value) : null]),
  );

  return {
    iso3: entity.iso3 ?? iso3,
    name: entity.name,
    region: entity.region ?? 'Unknown',
    population: indicatorMap.get('SP.POP.TOTL') ?? (entity.props as any)?.population ?? null,
    gdp: indicatorMap.get('NY.GDP.MKTP.CD') ?? null,
    hdi: indicatorMap.get('HDI') ?? null,
    conflictCount,
    riskLevel: calculateRiskLevel(conflictCount),
  };
}
