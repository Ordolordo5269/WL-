import axios from 'axios';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REST_COUNTRIES_URL =
  'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,region,subregion,latlng,population,area,capital';
const WB_BASE = 'https://api.worldbank.org/v2';
const REQUEST_TIMEOUT_MS = 20000;
const CREATE_BATCH_SIZE = 500;

type RestCountry = {
  name?: { common?: string; official?: string };
  cca2?: string;
  cca3?: string;
  region?: string;
  subregion?: string;
  latlng?: [number, number];
  population?: number;
  area?: number;
  capital?: string[];
};

type WorldBankPoint = { year: number; value: number | null };

type IndicatorSpec = {
  code: string;
  wbCode: string;
  name: string;
  topic: string;
  unit: string;
};

const INDICATOR_SPECS: IndicatorSpec[] = [
  // Economy
  { code: 'GDP_USD', wbCode: 'NY.GDP.MKTP.CD', name: 'GDP (current US$)', topic: 'Economy', unit: 'USD' },
  { code: 'GDP_PC_USD', wbCode: 'NY.GDP.PCAP.CD', name: 'GDP per capita (current US$)', topic: 'Economy', unit: 'USD' },
  { code: 'INFLATION_CPI_YOY_PCT', wbCode: 'FP.CPI.TOTL.ZG', name: 'Inflation, consumer prices (annual %)', topic: 'Economy', unit: '%' },
  { code: 'GINI_INDEX', wbCode: 'SI.POV.GINI', name: 'GINI index', topic: 'Economy', unit: 'index' },
  { code: 'AGRICULTURE_PERCENT_GDP', wbCode: 'NV.AGR.TOTL.ZS', name: 'Agriculture, value added (% of GDP)', topic: 'Economy', unit: '%' },
  { code: 'INDUSTRY_PERCENT_GDP', wbCode: 'NV.IND.TOTL.ZS', name: 'Industry, value added (% of GDP)', topic: 'Economy', unit: '%' },
  { code: 'SERVICES_PERCENT_GDP', wbCode: 'NV.SRV.TOTL.ZS', name: 'Services, value added (% of GDP)', topic: 'Economy', unit: '%' },
  { code: 'EXPORTS_USD', wbCode: 'NE.EXP.GNFS.CD', name: 'Exports of goods and services (current US$)', topic: 'Economy', unit: 'USD' },
  { code: 'IMPORTS_USD', wbCode: 'NE.IMP.GNFS.CD', name: 'Imports of goods and services (current US$)', topic: 'Economy', unit: 'USD' },
  { code: 'EXTERNAL_DEBT_USD', wbCode: 'DT.DOD.DECT.CD', name: 'External debt stocks, total (DOD, current US$)', topic: 'Economy', unit: 'USD' },
  { code: 'UNEMPLOYMENT_RATE_PERCENT', wbCode: 'SL.UEM.TOTL.ZS', name: 'Unemployment, total (% of labor force)', topic: 'Economy', unit: '%' },
  // Society
  { code: 'LIFE_EXPECTANCY', wbCode: 'SP.DYN.LE00.IN', name: 'Life expectancy at birth, total (years)', topic: 'Society', unit: 'years' },
  { code: 'LITERACY_RATE_ADULT', wbCode: 'SE.ADT.LITR.ZS', name: 'Adult literacy rate', topic: 'Society', unit: '%' },
  { code: 'POVERTY_EXTREME_215', wbCode: 'SI.POV.DDAY', name: 'Poverty headcount ratio at $2.15 a day', topic: 'Society', unit: '%' },
  { code: 'UHC_SERVICE_COVERAGE_INDEX', wbCode: 'SH.UHC.SRVS.CV.XD', name: 'UHC service coverage index', topic: 'Society', unit: 'index' },
  { code: 'PRIMARY_NET_ENROLLMENT', wbCode: 'SE.PRM.NENR', name: 'School enrollment, primary (net %)', topic: 'Society', unit: '%' },
  { code: 'POPULATION_TOTAL', wbCode: 'SP.POP.TOTL', name: 'Population, total', topic: 'Society', unit: 'people' },
  { code: 'POPULATION_GROWTH', wbCode: 'SP.POP.GROW', name: 'Population growth (annual %)', topic: 'Society', unit: '%' },
  { code: 'CRUDE_BIRTH_RATE', wbCode: 'SP.DYN.CBRT.IN', name: 'Birth rate, crude (per 1,000 people)', topic: 'Society', unit: 'per_1000' },
  { code: 'CRUDE_DEATH_RATE', wbCode: 'SP.DYN.CDRT.IN', name: 'Death rate, crude (per 1,000 people)', topic: 'Society', unit: 'per_1000' },
  { code: 'URBAN_POPULATION_PERCENT', wbCode: 'SP.URB.TOTL.IN.ZS', name: 'Urban population (% of total)', topic: 'Society', unit: '%' },
  { code: 'RURAL_POPULATION_PERCENT', wbCode: 'SP.RUR.TOTL.ZS', name: 'Rural population (% of total)', topic: 'Society', unit: '%' },
  { code: 'POPULATION_DENSITY', wbCode: 'SP.POP.DNST', name: 'Population density (people per sq. km)', topic: 'Society', unit: 'people_per_sq_km' },
];

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertCountriesFromRestCountries() {
  const { data } = await axios.get<RestCountry[]>(REST_COUNTRIES_URL, { timeout: REQUEST_TIMEOUT_MS });
  const candidates = Array.isArray(data) ? data : [];
  const operations = candidates
    .filter((c) => c?.cca3 && c.cca3.length === 3)
    .map((c) => {
      const name = c.name?.common || c.name?.official || c.cca3 || 'Unknown';
      const slug = slugify(name);
      const lat = Array.isArray(c.latlng) ? c.latlng[0] : undefined;
      const lng = Array.isArray(c.latlng) ? c.latlng[1] : undefined;
      return prisma.entity.upsert({
        where: { slug },
        create: {
          type: 'COUNTRY',
          name,
          slug,
          iso2: c.cca2 || undefined,
          iso3: c.cca3 || undefined,
          region: c.region || undefined,
          subregion: c.subregion || undefined,
          lat: typeof lat === 'number' ? lat : undefined,
          lng: typeof lng === 'number' ? lng : undefined,
          props: {
            capital: c.capital?.[0] ?? null,
            population: c.population ?? null,
            area: c.area ?? null,
            source: 'restcountries',
          } as Prisma.JsonObject,
        },
        update: {
          name,
          iso2: c.cca2 || undefined,
          iso3: c.cca3 || undefined,
          region: c.region || undefined,
          subregion: c.subregion || undefined,
          lat: typeof lat === 'number' ? lat : undefined,
          lng: typeof lng === 'number' ? lng : undefined,
          props: {
            capital: c.capital?.[0] ?? null,
            population: c.population ?? null,
            area: c.area ?? null,
            source: 'restcountries',
          } as Prisma.JsonObject,
        },
      });
    });

  const batches = chunk(operations, 50);
  for (const batch of batches) {
    await prisma.$transaction(batch);
  }
  console.log(`Upserted ${operations.length} countries from REST Countries`);
}

async function ensureIndicatorMetadata() {
  const ops = INDICATOR_SPECS.map((spec) =>
    prisma.indicator.upsert({
      where: { code: spec.code },
      create: {
        code: spec.code,
        name: spec.name,
        topic: spec.topic,
        unit: spec.unit,
        source: 'World Bank',
      },
      update: {
        name: spec.name,
        topic: spec.topic,
        unit: spec.unit,
        source: 'World Bank',
      },
    })
  );
  const batches = chunk(ops, 20);
  for (const batch of batches) {
    await prisma.$transaction(batch);
  }
  console.log(`Ensured metadata for ${INDICATOR_SPECS.length} indicators`);
}

async function fetchWorldBankSeries(iso3: string, wbCode: string): Promise<WorldBankPoint[]> {
  const url = `${WB_BASE}/country/${encodeURIComponent(iso3)}/indicator/${encodeURIComponent(
    wbCode
  )}?format=json&per_page=20000`;
  const { data } = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
  const rows: any[] = Array.isArray(data?.[1]) ? data[1] : [];
  return rows
    .map((row) => {
      const year = parseInt(String(row?.date), 10);
      const value = row?.value;
      return Number.isFinite(year) ? { year, value: value === null || value === undefined ? null : Number(value) } : null;
    })
    .filter((p): p is WorldBankPoint => Boolean(p));
}

async function ingestIndicatorForCountry(
  entityId: string,
  iso3: string,
  spec: IndicatorSpec
): Promise<{ count: number }> {
  const series = await fetchWorldBankSeries(iso3, spec.wbCode);
  if (!series.length) {
    console.warn(`No data for ${iso3} ${spec.code}`);
    return { count: 0 };
  }

  const createPayload = series.map((point) => ({
    entityId,
    indicatorCode: spec.code,
    year: point.year,
    value: point.value !== null ? new Prisma.Decimal(point.value) : null,
    source: 'World Bank',
  }));

  const batches = chunk(createPayload, CREATE_BATCH_SIZE).map((batch) =>
    prisma.indicatorValue.createMany({ data: batch, skipDuplicates: true })
  );

  await prisma.$transaction([
    prisma.indicatorValue.deleteMany({ where: { entityId, indicatorCode: spec.code } }),
    ...batches,
  ]);

  return { count: createPayload.length };
}

async function ingestAllIndicators() {
  const countries = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, slug: true },
  });

  for (const country of countries) {
    const iso3 = country.iso3 as string;
    for (const spec of INDICATOR_SPECS) {
      try {
        const { count } = await ingestIndicatorForCountry(country.id, iso3, spec);
        if (count > 0) {
          console.log(`Stored ${count} rows for ${iso3} ${spec.code}`);
        }
      } catch (error) {
        console.error(`Failed to ingest ${spec.code} for ${iso3}:`, (error as Error).message);
      }
    }
  }
}

async function main() {
  try {
    await upsertCountriesFromRestCountries();
    await ensureIndicatorMetadata();
    await ingestAllIndicators();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Ingestion failed', error);
  process.exit(1);
});





















