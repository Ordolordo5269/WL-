import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';

// Set the target latest year as the previous calendar year, since WB often lags
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

type WorldBankSeriesPoint = {
  date: string; // year
  value: number | null;
};

async function ensureIndicators() {
  await prisma.indicator.upsert({
    where: { code: 'GDP_PC_USD' },
    create: { code: 'GDP_PC_USD', name: 'GDP per capita (current US$)', topic: 'Economy', unit: 'USD', source: 'World Bank' },
    update: { name: 'GDP per capita (current US$)', unit: 'USD', source: 'World Bank' },
  });
}

async function fetchGdpPerCapitaSeriesIso3(iso3: string): Promise<WorldBankSeriesPoint[]> {
  const indicator = 'NY.GDP.PCAP.CD';
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

async function upsertGdpPerCapitaForCountry(entityId: string, iso3: string) {
  const series = await fetchGdpPerCapitaSeriesIso3(iso3);
  // Upsert full series
  for (const p of series) {
    const year = parseInt(p.date, 10);
    if (isNaN(year)) continue;
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode: 'GDP_PC_USD', year } },
      update: { value: p.value != null ? new Prisma.Decimal(p.value) : null, source: 'World Bank' },
      create: { entityId, indicatorCode: 'GDP_PC_USD', year, value: p.value != null ? new Prisma.Decimal(p.value) : null, source: 'World Bank' },
    });
  }

  // Ensure a record exists for TARGET_LATEST_YEAR. If null, fallback to the latest available and mark meta.
  const target = series.find(p => parseInt(p.date, 10) === TARGET_LATEST_YEAR);
  const latest = findLatestWithFallback(series);

  if (target && target.value != null) {
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode: 'GDP_PC_USD', year: TARGET_LATEST_YEAR } },
      update: { value: new Prisma.Decimal(target.value), source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: TARGET_LATEST_YEAR, fallback: false } as any },
      create: { entityId, indicatorCode: 'GDP_PC_USD', year: TARGET_LATEST_YEAR, value: new Prisma.Decimal(target.value), source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: TARGET_LATEST_YEAR, fallback: false } as any },
    });
  } else if (latest.year != null) {
    await prisma.indicatorValue.upsert({
      where: { entityId_indicatorCode_year: { entityId, indicatorCode: 'GDP_PC_USD', year: TARGET_LATEST_YEAR } },
      update: { value: latest.value != null ? new Prisma.Decimal(latest.value) : null, source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true } as any },
      create: { entityId, indicatorCode: 'GDP_PC_USD', year: TARGET_LATEST_YEAR, value: latest.value != null ? new Prisma.Decimal(latest.value) : null, source: 'World Bank', meta: { targetYear: TARGET_LATEST_YEAR, latestAvailableYear: latest.year, fallback: true } as any },
    });
  }
}

async function main() {
  await ensureIndicators();
  
  const entities = await prisma.entity.findMany({ 
    where: { type: 'COUNTRY', iso3: { not: null } }, 
    select: { id: true, iso3: true, slug: true } 
  });

  console.log(`Found ${entities.length} countries to ingest GDP per capita data for`);

  let successCount = 0;
  let errorCount = 0;

  for (const e of entities) {
    try {
      await upsertGdpPerCapitaForCountry(e.id, e.iso3 as string);
      successCount++;
      console.log(`✓ Ingested GDP per capita for ${e.slug} (${e.iso3})`);
    } catch (err) {
      errorCount++;
      console.error(`✗ Failed GDP per capita for ${e.slug} (${e.iso3}):`, (err as Error).message);
    }
  }

  console.log(`\n✅ GDP per capita ingestion completed! Success: ${successCount}, Errors: ${errorCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });



















