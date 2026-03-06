import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const WB_BASE = 'https://api.worldbank.org/v2';
const CURRENT_YEAR = new Date().getUTCFullYear();
const TARGET_LATEST_YEAR = CURRENT_YEAR - 1;

type SeriesPoint = { date: string; value: number | null };

const INDICATORS: Array<{ code: string; wb: string; name: string; unit?: string | null }> = [
  { code: 'GDP_USD', wb: 'NY.GDP.MKTP.CD', name: 'GDP (current US$)', unit: 'USD' },
  { code: 'GDP_PC_USD', wb: 'NY.GDP.PCAP.CD', name: 'GDP per capita (current US$)', unit: 'USD' },
  { code: 'INFLATION_CPI_YOY_PCT', wb: 'FP.CPI.TOTL.ZG', name: 'Inflation, consumer prices (annual %)', unit: 'percent' },
  { code: 'GINI_INDEX', wb: 'SI.POV.GINI', name: 'GINI Index', unit: null },
  { code: 'AGRICULTURE_PERCENT_GDP', wb: 'NV.AGR.TOTL.ZS', name: 'Agriculture, value added (% of GDP)', unit: 'percent' },
  { code: 'INDUSTRY_PERCENT_GDP', wb: 'NV.IND.TOTL.ZS', name: 'Industry, value added (% of GDP)', unit: 'percent' },
  { code: 'SERVICES_PERCENT_GDP', wb: 'NV.SRV.TOTL.ZS', name: 'Services, value added (% of GDP)', unit: 'percent' },
  { code: 'EXPORTS_USD', wb: 'NE.EXP.GNFS.CD', name: 'Exports of goods and services (current US$)', unit: 'USD' },
  { code: 'IMPORTS_USD', wb: 'NE.IMP.GNFS.CD', name: 'Imports of goods and services (current US$)', unit: 'USD' },
  { code: 'EXTERNAL_DEBT_USD', wb: 'DT.DOD.DECT.CD', name: 'External debt stocks, total (DOD, current US$)', unit: 'USD' },
  { code: 'UNEMPLOYMENT_RATE_PERCENT', wb: 'SL.UEM.TOTL.ZS', name: 'Unemployment, total (% of total labor force)', unit: 'percent' }
];

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: {
        code: it.code,
        name: it.name,
        topic: 'Economy',
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
  const perPage = 2000;
  const url = `${WB_BASE}/country?format=json&per_page=${perPage}`;
  const { data } = await axios.get(url);
  const countries: any[] = Array.isArray(data?.[1]) ? data[1] : [];
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
  }
}

async function main() {
  await ensureIndicators();
  await enrichCountryMeta();

  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, slug: true }
  });

  for (const e of entities) {
    for (const it of INDICATORS) {
      try {
        const series = await fetchSeriesIso3(e.iso3 as string, it.wb);
        await upsertSeries(e.id, it.code, series);
        console.log(`Ingested ${it.code} for ${e.slug}`);
      } catch (err) {
        console.error(`Failed ${it.code} for ${e.slug}:`, (err as Error).message);
      }
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

















