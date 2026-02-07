import { prisma } from '../db/client';

const CODES = [
  'GDP_USD',
  'GDP_PC_USD',
  'INFLATION_CPI_YOY_PCT',
  'GINI_INDEX',
  'AGRICULTURE_PERCENT_GDP',
  'INDUSTRY_PERCENT_GDP',
  'SERVICES_PERCENT_GDP',
  'EXPORTS_USD',
  'IMPORTS_USD',
  'EXTERNAL_DEBT_USD',
  'UNEMPLOYMENT_RATE_PERCENT',
  'LIFE_EXPECTANCY',
  'LITERACY_RATE_ADULT',
  'POVERTY_EXTREME_215',
  'UHC_SERVICE_COVERAGE_INDEX',
  'PRIMARY_NET_ENROLLMENT',
  'POPULATION_TOTAL',
  'POPULATION_GROWTH',
  'CRUDE_BIRTH_RATE',
  'CRUDE_DEATH_RATE',
  'URBAN_POPULATION_PERCENT',
  'RURAL_POPULATION_PERCENT',
  'POPULATION_DENSITY',
];

async function main() {
  const countries = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, name: true },
  });

  const rows = await prisma.indicatorValue.findMany({
    where: { indicatorCode: { in: CODES }, value: { not: null } },
    select: {
      indicatorCode: true,
      entity: { select: { iso3: true, name: true } },
    },
  });

  const coverage = new Map<string, Set<string>>();
  for (const r of rows) {
    const iso3 = r.entity?.iso3;
    if (!iso3) continue;
    let set = coverage.get(iso3);
    if (!set) {
      set = new Set<string>();
      coverage.set(iso3, set);
    }
    set.add(r.indicatorCode);
  }

  const missing: Array<{ iso3: string; name: string | null; missing: string[] }> = [];
  const full: string[] = [];

  for (const c of countries) {
    const set = coverage.get(c.iso3!) ?? new Set<string>();
    const missingCodes = CODES.filter((code) => !set.has(code));
    if (missingCodes.length === 0) {
      full.push(c.iso3!);
    } else {
      missing.push({ iso3: c.iso3!, name: c.name, missing: missingCodes });
    }
  }

  console.log('Total countries', countries.length);
  console.log('Full coverage', full.length);
  console.log('Missing coverage', missing.length);
  console.log('Examples missing (first 30):');
  for (const m of missing.slice(0, 30)) {
    console.log(`${m.iso3} - ${m.name ?? 'Unknown'} : ${m.missing.join(',')}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

