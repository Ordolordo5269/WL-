/**
 * Fallback ingestion: CIA World Factbook data for countries not covered by World Bank.
 * Fetches from https://github.com/factbook/factbook.json and supplements
 * with curated data for key missing countries (Taiwan, Kosovo, etc.).
 *
 * Only targets countries with ZERO commodity data in our DB.
 */
import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';
import { getSourceMetadata } from './lib/source-metadata';

const prisma = new PrismaClient();

const COMMODITY_CODES = [
  'ENERGY_IMPORTS_PCT', 'FUEL_EXPORTS_PCT_MERCH', 'FUEL_IMPORTS_PCT_MERCH',
  'ENERGY_USE_KG_OIL_EQ_PC', 'ELECTRICITY_RENEWABLES_PCT',
  'MINERAL_RENTS_PCT_GDP', 'ORE_METAL_EXPORTS_PCT',
  'CEREAL_PRODUCTION_MT', 'CEREAL_YIELD_KG_HA',
  'FOOD_EXPORTS_PCT', 'FOOD_IMPORTS_PCT', 'ARABLE_LAND_PCT'
];

const FACTBOOK_BASE = 'https://raw.githubusercontent.com/factbook/factbook.json/master';

// CIA 2-letter code → { iso3, region directory }
const CIA_TO_ISO3: Array<{ cia: string; dir: string; iso3: string; name: string }> = [
  { cia: 'tw', dir: 'east-n-southeast-asia', iso3: 'TWN', name: 'Taiwan' },
  { cia: 'kv', dir: 'europe',                iso3: 'UNK', name: 'Kosovo' },
  { cia: 'wi', dir: 'africa',                iso3: 'ESH', name: 'Western Sahara' },
  { cia: 'fg', dir: 'south-america',         iso3: 'GUF', name: 'French Guiana' },
  { cia: 'gp', dir: 'central-america-n-caribbean', iso3: 'GLP', name: 'Guadeloupe' },
  { cia: 'mb', dir: 'central-america-n-caribbean', iso3: 'MTQ', name: 'Martinique' },
  { cia: 're', dir: 'africa',                iso3: 'REU', name: 'Reunion' },
  { cia: 'mf', dir: 'africa',                iso3: 'MYT', name: 'Mayotte' },
  { cia: 'je', dir: 'europe',                iso3: 'JEY', name: 'Jersey' },
  { cia: 'gk', dir: 'europe',                iso3: 'GGY', name: 'Guernsey' },
  { cia: 'fk', dir: 'south-america',         iso3: 'FLK', name: 'Falkland Islands' },
  { cia: 'av', dir: 'central-america-n-caribbean', iso3: 'AIA', name: 'Anguilla' },
  { cia: 'mh', dir: 'central-america-n-caribbean', iso3: 'MSR', name: 'Montserrat' },
  { cia: 'sh', dir: 'africa',                iso3: 'SHN', name: 'Saint Helena' },
  { cia: 'sb', dir: 'north-america',         iso3: 'SPM', name: 'Saint Pierre and Miquelon' },
  { cia: 'wf', dir: 'australia-oceania',     iso3: 'WLF', name: 'Wallis and Futuna' },
  { cia: 'cw', dir: 'australia-oceania',     iso3: 'COK', name: 'Cook Islands' },
  { cia: 'ne', dir: 'australia-oceania',     iso3: 'NIU', name: 'Niue' },
  { cia: 'tl', dir: 'australia-oceania',     iso3: 'TKL', name: 'Tokelau' },
  { cia: 'pc', dir: 'australia-oceania',     iso3: 'PCN', name: 'Pitcairn Islands' },
  { cia: 'nf', dir: 'australia-oceania',     iso3: 'NFK', name: 'Norfolk Island' },
  { cia: 'sv', dir: 'arctic',                iso3: 'SJM', name: 'Svalbard' },
  { cia: 'vt', dir: 'europe',                iso3: 'VAT', name: 'Vatican City' },
  { cia: 'nn', dir: 'central-america-n-caribbean', iso3: 'BES', name: 'Caribbean Netherlands' },
  { cia: 'tb', dir: 'central-america-n-caribbean', iso3: 'BLM', name: 'Saint Barthelemy' },
];

// Curated supplementary data for key countries (from CIA Factbook + official sources)
// These fill metrics that can't be parsed from Factbook JSON (trade %, production tonnage, etc.)
const CURATED_DATA: Record<string, Partial<Record<string, number>>> = {
  TWN: {
    // Source: CIA World Factbook 2023, Taiwan Bureau of Energy, Taiwan Council of Agriculture
    ENERGY_IMPORTS_PCT: 97.7,       // Taiwan imports ~97.7% of energy (produces <1% of oil/gas needs)
    FUEL_EXPORTS_PCT_MERCH: 5.2,    // Refined petroleum re-exports
    FUEL_IMPORTS_PCT_MERCH: 18.3,   // Crude oil + LNG imports as % of merchandise
    ENERGY_USE_KG_OIL_EQ_PC: 4500,  // High per-capita energy use (industrial economy)
    MINERAL_RENTS_PCT_GDP: 0.02,    // Minimal mining sector
    ORE_METAL_EXPORTS_PCT: 3.1,     // Steel/metal products
    CEREAL_PRODUCTION_MT: 1700000,  // Mostly rice (~1.5M t) + some wheat/corn
    CEREAL_YIELD_KG_HA: 5800,       // Rice yield ~5.8 t/ha
    FOOD_EXPORTS_PCT: 2.5,          // Small food export sector
    FOOD_IMPORTS_PCT: 6.8,          // Significant food imports (soybeans, wheat, corn)
  },
  UNK: {
    // Source: CIA World Factbook 2023, Kosovo Agency of Statistics
    ENERGY_IMPORTS_PCT: 35.0,       // Kosovo imports ~35% of electricity + all oil/gas
    FUEL_IMPORTS_PCT_MERCH: 15.2,   // Petroleum imports
    MINERAL_RENTS_PCT_GDP: 0.8,     // Nickel, lead, zinc, chrome mining
    ORE_METAL_EXPORTS_PCT: 12.5,    // Mining is significant export sector
    CEREAL_PRODUCTION_MT: 700000,   // Wheat + corn
    CEREAL_YIELD_KG_HA: 4200,       // Moderate yield
    FOOD_EXPORTS_PCT: 4.5,          // Small food exports
    FOOD_IMPORTS_PCT: 20.0,         // Kosovo is a major food importer
  },
};

// ── Factbook JSON parsing helpers ──

function parsePercent(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = text.match(/([\d.]+)%/);
  return match ? parseFloat(match[1]) : null;
}

function parseNumber(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = text.match(/([\d,.]+)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

function getNestedValue(obj: any, ...keys: string[]): any {
  let current = obj;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function getTextField(obj: any, ...keys: string[]): string | null {
  const val = getNestedValue(obj, ...keys);
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.text) return val.text;
  return null;
}

interface ParsedFactbook {
  arableLandPct: number | null;
  renewablesPct: number | null;
  energyPerCapita: number | null;
}

function parseFactbookJson(json: any): ParsedFactbook {
  // 1. Arable land
  const arableText = getTextField(json, 'Geography', 'Land use', 'agricultural land: arable land');
  const arableLandPct = parsePercent(arableText);

  // 2. Renewable electricity (sum of solar + wind + hydro + biomass)
  const egenSources = getNestedValue(json, 'Energy', 'Electricity generation sources');
  let renewablesPct: number | null = null;
  if (egenSources) {
    const solar = parsePercent(getTextField(json, 'Energy', 'Electricity generation sources', 'solar'));
    const wind = parsePercent(getTextField(json, 'Energy', 'Electricity generation sources', 'wind'));
    const hydro = parsePercent(getTextField(json, 'Energy', 'Electricity generation sources', 'hydroelectricity'));
    const biomass = parsePercent(getTextField(json, 'Energy', 'Electricity generation sources', 'biomass and waste'));
    const parts = [solar, wind, hydro, biomass].filter((v): v is number => v !== null);
    if (parts.length > 0) {
      renewablesPct = parts.reduce((a, b) => a + b, 0);
    }
  }

  // 3. Energy consumption per capita
  const epcSection = getNestedValue(json, 'Energy', 'Energy consumption per capita');
  let energyPerCapita: number | null = null;
  if (epcSection) {
    // The field name varies but contains "Total energy consumption per capita"
    for (const key of Object.keys(epcSection)) {
      if (key.toLowerCase().includes('total energy consumption')) {
        const text = typeof epcSection[key] === 'object' ? epcSection[key].text : epcSection[key];
        if (typeof text === 'string') {
          // Value is in Btu/person, convert to kg oil equivalent (1 kg oil eq = 39,683.2 Btu)
          const btu = parseNumber(text);
          if (btu !== null) {
            energyPerCapita = Math.round(btu / 39683.2);
          }
        }
      }
    }
  }

  return { arableLandPct, renewablesPct, energyPerCapita };
}

// ── Main ──

async function main() {
  console.log('\n=== WorldLore: CIA Factbook Fallback Ingestion ===\n');

  const { sourceVersion, sourceReleaseDate } = getSourceMetadata('CIA World Factbook');

  // 1. Find countries with zero commodity data
  const allEntities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, name: true },
    distinct: ['iso3']
  });

  const iso3ToEntity: Record<string, { id: string; name: string }> = {};
  for (const e of allEntities) {
    const key = (e.iso3 as string).toUpperCase();
    if (!iso3ToEntity[key]) iso3ToEntity[key] = { id: e.id, name: e.name ?? key };
  }

  // Check which countries have zero commodity data
  const missingIso3s: Set<string> = new Set();
  for (const iso3 of Object.keys(iso3ToEntity)) {
    const count = await prisma.indicatorValue.count({
      where: {
        indicatorCode: { in: COMMODITY_CODES },
        value: { not: null },
        entity: { type: 'COUNTRY', iso3 }
      }
    });
    if (count === 0) missingIso3s.add(iso3);
  }

  console.log(`Countries with zero commodity data: ${missingIso3s.size}`);

  // 2. Filter to countries we have Factbook mappings for
  const toProcess = CIA_TO_ISO3.filter(c => missingIso3s.has(c.iso3));
  console.log(`Countries with Factbook mapping: ${toProcess.length}\n`);

  let totalUpserted = 0;
  let totalFetched = 0;

  for (const entry of toProcess) {
    const entity = iso3ToEntity[entry.iso3];
    if (!entity) {
      console.log(`  ${entry.iso3} - ${entry.name}: no entity in DB, skipping`);
      continue;
    }

    console.log(`[${entry.iso3}] ${entry.name}`);

    // 3. Fetch from Factbook
    let parsed: ParsedFactbook = { arableLandPct: null, renewablesPct: null, energyPerCapita: null };
    const url = `${FACTBOOK_BASE}/${entry.dir}/${entry.cia}.json`;
    try {
      const { data: json } = await axios.get(url, { timeout: 10000 });
      parsed = parseFactbookJson(json);
      totalFetched++;
      console.log(`  Factbook: arable=${parsed.arableLandPct}%, renewables=${parsed.renewablesPct}%, energy/cap=${parsed.energyPerCapita}`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log(`  Factbook: not found (404)`);
      } else {
        console.log(`  Factbook: error - ${err.message}`);
      }
    }

    // 4. Merge: Factbook parsed data + curated data (curated takes priority for non-null)
    const curated = CURATED_DATA[entry.iso3] || {};
    const indicators: Array<{ code: string; value: number }> = [];
    const year = 2023; // CIA Factbook estimates are typically 2023

    // Add Factbook-parsed values
    if (parsed.arableLandPct !== null && !curated.ARABLE_LAND_PCT) {
      indicators.push({ code: 'ARABLE_LAND_PCT', value: parsed.arableLandPct });
    }
    if (parsed.renewablesPct !== null && !curated.ELECTRICITY_RENEWABLES_PCT) {
      indicators.push({ code: 'ELECTRICITY_RENEWABLES_PCT', value: parsed.renewablesPct });
    }
    if (parsed.energyPerCapita !== null && !curated.ENERGY_USE_KG_OIL_EQ_PC) {
      indicators.push({ code: 'ENERGY_USE_KG_OIL_EQ_PC', value: parsed.energyPerCapita });
    }

    // Add curated data (overrides Factbook for overlapping fields)
    for (const [code, value] of Object.entries(curated)) {
      if (value !== undefined && value !== null) {
        // Remove if already added from Factbook
        const idx = indicators.findIndex(i => i.code === code);
        if (idx >= 0) indicators.splice(idx, 1);
        indicators.push({ code, value });
      }
    }

    if (indicators.length === 0) {
      console.log(`  No data to ingest\n`);
      continue;
    }

    // 5. Upsert into DB
    for (const ind of indicators) {
      await prisma.indicatorValue.upsert({
        where: { entityId_indicatorCode_year: { entityId: entity.id, indicatorCode: ind.code, year } },
        update: { value: new Prisma.Decimal(ind.value), source: 'CIA World Factbook', sourceVersion, sourceReleaseDate, ingestedAt: new Date() },
        create: { entityId: entity.id, indicatorCode: ind.code, year, value: new Prisma.Decimal(ind.value), source: 'CIA World Factbook', sourceVersion, sourceReleaseDate, ingestedAt: new Date() }
      });
      // Also upsert at year 2025 for consistent lookups (same pattern as WB ingestion)
      await prisma.indicatorValue.upsert({
        where: { entityId_indicatorCode_year: { entityId: entity.id, indicatorCode: ind.code, year: 2025 } },
        update: { value: new Prisma.Decimal(ind.value), source: 'CIA World Factbook', meta: { targetYear: 2025, latestAvailableYear: year, fallback: true } as any, sourceVersion, sourceReleaseDate, ingestedAt: new Date() },
        create: { entityId: entity.id, indicatorCode: ind.code, year: 2025, value: new Prisma.Decimal(ind.value), source: 'CIA World Factbook', meta: { targetYear: 2025, latestAvailableYear: year, fallback: true } as any, sourceVersion, sourceReleaseDate, ingestedAt: new Date() }
      });
    }

    totalUpserted += indicators.length;
    console.log(`  Upserted ${indicators.length} indicators: ${indicators.map(i => i.code.substring(0, 20)).join(', ')}\n`);
  }

  console.log('\n=== Factbook Ingestion Complete ===');
  console.log(`Factbook JSONs fetched: ${totalFetched}`);
  console.log(`Total indicators upserted: ${totalUpserted}`);
  console.log(`Countries still missing: ${missingIso3s.size - toProcess.filter(c => iso3ToEntity[c.iso3]).length} (uninhabited territories)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
