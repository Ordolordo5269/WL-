import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';

// Set the target latest year as the previous calendar year, since WB often lags
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

type WorldBankCountry = {
  id: string; // 3-letter code
  iso2Code: string;
  name: string;
  region: { id: string; value: string };
  incomeLevel: { id: string; value: string };
  lendingType: { id: string; value: string };
  capitalCity: string;
  longitude: string;
  latitude: string;
};

function isRealCountry(c: WorldBankCountry): boolean {
  const hasIso3 = Boolean(c.id) && c.id.length === 3;
  const isAggregate = c.region?.value === 'Aggregates' || !hasIso3;
  return hasIso3 && !isAggregate;
}

async function fetchAllCountries(): Promise<WorldBankCountry[]> {
  const perPage = 2000;
  const url = `${WB_BASE}/country?format=json&per_page=${perPage}`;
  const { data } = await axios.get(url);
  const countries: WorldBankCountry[] = Array.isArray(data?.[1]) ? data[1] : [];
  return countries.filter(isRealCountry);
}

async function ensureIndicators() {
  await prisma.indicator.upsert({
    where: { code: 'GDP_USD' },
    create: { code: 'GDP_USD', name: 'GDP (current US$)', topic: 'Economy', unit: 'USD', source: 'World Bank' },
    update: { name: 'GDP (current US$)', unit: 'USD', source: 'World Bank' },
  });
}

async function upsertCountries(countries: WorldBankCountry[]) {
  for (const c of countries) {
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await prisma.entity.upsert({
      where: { slug },
      create: {
        type: 'COUNTRY',
        name: c.name,
        slug,
        iso2: c.iso2Code || undefined,
        iso3: c.id || undefined,
        region: c.region?.value || undefined,
        subregion: (!!c.region?.id && c.region.id !== 'NA') ? c.region.id : undefined,
        lat: c.latitude ? parseFloat(c.latitude) : undefined,
        lng: c.longitude ? parseFloat(c.longitude) : undefined,
        wbCode: c.id,
      } as any,
      update: {
        name: c.name,
        iso2: c.iso2Code || undefined,
        iso3: c.id || undefined,
        region: c.region?.value || undefined,
        subregion: (!!c.region?.id && c.region.id !== 'NA') ? c.region.id : undefined,
        lat: c.latitude ? parseFloat(c.latitude) : undefined,
        lng: c.longitude ? parseFloat(c.longitude) : undefined,
        wbCode: c.id,
      } as any,
    });
  }
}

type WorldBankSeriesPoint = {
  date: string; // year
  value: number | null;
};

async function fetchGdpSeriesIso3(iso3: string): Promise<WorldBankSeriesPoint[]> {
  const indicator = 'NY.GDP.MKTP.CD';
  const url = `${WB_BASE}/country/${iso3}/indicator/${indicator}?format=json&per_page=20000`;
  const { data } = await axios.get(url);
  const rows: any[] = Array.isArray(data?.[1]) ? data[1] : [];
  // WB returns latest-first order (e.g., 2024, 2023, ...). Keep as-is for latest-first logic.
  return rows.map(r => ({ date: r.date, value: r.value }));
}

function findLatestWithFallback(points: WorldBankSeriesPoint[]): { year: number | null; value: number | null } {
  for (const p of points) {
    const year = parseInt(p.date, 10);
    if (!isNaN(year) && p.value != null) {
      return { year, value: p.value };
    }
  }
  return { year: null, value: null };
}

async function upsertGdpForCountry(entityId: string, iso3: string) {
  const series = await fetchGdpSeriesIso3(iso3);
  // Upsert full series
  for (const p of series) {
    const year = parseInt(p.date, 10);
    if (isNaN(year)) continue;
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode: 'GDP_USD', year } },
      update: { value: p.value != null ? new Prisma.Decimal(p.value) : null, source: 'World Bank' },
      create: { entityId, indicatorCode: 'GDP_USD', year, value: p.value != null ? new Prisma.Decimal(p.value) : null, source: 'World Bank' },
    });
  }

  // Ensure a record exists for TARGET_LATEST_YEAR. If null, fallback to the latest available and mark meta.
  const target = series.find(p => parseInt(p.date, 10) === TARGET_LATEST_YEAR);
  const latest = findLatestWithFallback(series);

  if (target && target.value != null) {
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode: 'GDP_USD', year: TARGET_LATEST_YEAR } },
      update: { value: new Prisma.Decimal(target.value), source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: TARGET_LATEST_YEAR, fallback: false } as any },
      create: { entityId, indicatorCode: 'GDP_USD', year: TARGET_LATEST_YEAR, value: new Prisma.Decimal(target.value), source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: TARGET_LATEST_YEAR, fallback: false } as any },
    });
  } else if (latest.year != null) {
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode: 'GDP_USD', year: TARGET_LATEST_YEAR } },
      update: { value: latest.value != null ? new Prisma.Decimal(latest.value) : null, source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true } as any },
      create: { entityId, indicatorCode: 'GDP_USD', year: TARGET_LATEST_YEAR, value: latest.value != null ? new Prisma.Decimal(latest.value) : null, source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true } as any },
    });
  }
}

async function main() {
  await ensureIndicators();
  const countries = await fetchAllCountries();
  await upsertCountries(countries);

  const entities = await prisma.entity.findMany({ where: { type: 'COUNTRY', iso3: { not: null } }, select: { id: true, iso3: true, slug: true } });

  for (const e of entities) {
    try {
      await upsertGdpForCountry(e.id, e.iso3 as string);
      console.log(`Ingested GDP for ${e.slug}`);
    } catch (err) {
      console.error(`Failed GDP for ${e.slug}:`, (err as Error).message);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
