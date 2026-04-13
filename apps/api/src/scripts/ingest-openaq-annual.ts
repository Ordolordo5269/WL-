/**
 * Ingest OpenAQ — Air quality monitoring station coverage
 *
 * Source: OpenAQ v3 API (api.openaq.org/v3)
 * Requires: OPENAQ_API_KEY in environment
 *
 * DESIGN DECISION (IMPORTANT):
 * We deliberately do NOT compute country-level annual PM2.5/PM10 averages.
 * Reason: OpenAQ station coverage is very unequal — Europe/US have dozens of
 * stations per country, while much of Africa and Central Asia have 0-3. Averaging
 * a single ground station to represent a whole country is methodologically
 * misleading (see mentor note in plan).
 *
 * Instead, we ingest:
 *   - AQ_STATIONS_COUNT: how many monitoring stations OpenAQ has per country.
 *
 * This is an honest "data reliability / coverage" feature for ML + UI.
 * For actual air quality values, we keep World Bank's PM25_AIR_POLLUTION
 * (modeled, 100% country coverage, satellite-derived).
 *
 * If a user wants real-time station-level readings, that's a different feature
 * (Phase C) requiring an AirQualityReading table and map UI.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

dotenv.config();

const prisma = new PrismaClient();

const API_BASE = 'https://api.openaq.org/v3';
const API_KEY = process.env.OPENAQ_API_KEY;

const INDICATORS = [
  { code: 'AQ_STATIONS_COUNT', name: 'Air Quality Monitoring Stations', unit: 'count', topic: 'Environment' },
];

// ISO2 (OpenAQ) → ISO3 (our entities)
// OpenAQ uses ISO2 country codes
const ISO2_TO_ISO3: Record<string, string> = {
  AF: 'AFG', AL: 'ALB', DZ: 'DZA', AO: 'AGO', AR: 'ARG', AM: 'ARM', AU: 'AUS',
  AT: 'AUT', AZ: 'AZE', BH: 'BHR', BD: 'BGD', BY: 'BLR', BE: 'BEL', BZ: 'BLZ',
  BJ: 'BEN', BT: 'BTN', BO: 'BOL', BA: 'BIH', BW: 'BWA', BR: 'BRA', BN: 'BRN',
  BG: 'BGR', BF: 'BFA', BI: 'BDI', KH: 'KHM', CM: 'CMR', CA: 'CAN', CV: 'CPV',
  CF: 'CAF', TD: 'TCD', CL: 'CHL', CN: 'CHN', CO: 'COL', KM: 'COM', CG: 'COG',
  CD: 'COD', CR: 'CRI', CI: 'CIV', HR: 'HRV', CU: 'CUB', CY: 'CYP', CZ: 'CZE',
  DK: 'DNK', DJ: 'DJI', DM: 'DMA', DO: 'DOM', EC: 'ECU', EG: 'EGY', SV: 'SLV',
  GQ: 'GNQ', ER: 'ERI', EE: 'EST', SZ: 'SWZ', ET: 'ETH', FJ: 'FJI', FI: 'FIN',
  FR: 'FRA', GA: 'GAB', GM: 'GMB', GE: 'GEO', DE: 'DEU', GH: 'GHA', GR: 'GRC',
  GT: 'GTM', GN: 'GIN', GW: 'GNB', GY: 'GUY', HT: 'HTI', HN: 'HND', HU: 'HUN',
  IS: 'ISL', IN: 'IND', ID: 'IDN', IR: 'IRN', IQ: 'IRQ', IE: 'IRL', IL: 'ISR',
  IT: 'ITA', JM: 'JAM', JP: 'JPN', JO: 'JOR', KZ: 'KAZ', KE: 'KEN', KP: 'PRK',
  KR: 'KOR', KW: 'KWT', KG: 'KGZ', LA: 'LAO', LV: 'LVA', LB: 'LBN', LS: 'LSO',
  LR: 'LBR', LY: 'LBY', LT: 'LTU', LU: 'LUX', MG: 'MDG', MW: 'MWI', MY: 'MYS',
  MV: 'MDV', ML: 'MLI', MT: 'MLT', MR: 'MRT', MU: 'MUS', MX: 'MEX', MD: 'MDA',
  MN: 'MNG', ME: 'MNE', MA: 'MAR', MZ: 'MOZ', MM: 'MMR', NA: 'NAM', NP: 'NPL',
  NL: 'NLD', NZ: 'NZL', NI: 'NIC', NE: 'NER', NG: 'NGA', MK: 'MKD', NO: 'NOR',
  OM: 'OMN', PK: 'PAK', PA: 'PAN', PG: 'PNG', PY: 'PRY', PE: 'PER', PH: 'PHL',
  PL: 'POL', PT: 'PRT', QA: 'QAT', RO: 'ROU', RU: 'RUS', RW: 'RWA', SA: 'SAU',
  SN: 'SEN', RS: 'SRB', SL: 'SLE', SG: 'SGP', SK: 'SVK', SI: 'SVN', SB: 'SLB',
  SO: 'SOM', ZA: 'ZAF', SS: 'SSD', ES: 'ESP', LK: 'LKA', SD: 'SDN', SR: 'SUR',
  SE: 'SWE', CH: 'CHE', SY: 'SYR', TW: 'TWN', TJ: 'TJK', TZ: 'TZA', TH: 'THA',
  TL: 'TLS', TG: 'TGO', TT: 'TTO', TN: 'TUN', TR: 'TUR', TM: 'TKM', UG: 'UGA',
  UA: 'UKR', AE: 'ARE', GB: 'GBR', US: 'USA', UY: 'URY', UZ: 'UZB', VE: 'VEN',
  VN: 'VNM', YE: 'YEM', ZM: 'ZMB', ZW: 'ZWE', PS: 'PSE', XK: 'UNK',
  HK: 'HKG', MO: 'MAC',
};

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: {
        code: it.code,
        name: it.name,
        topic: it.topic,
        unit: it.unit,
        source: 'OpenAQ',
        description: 'Number of active air quality monitoring stations per country (OpenAQ network). Used as a data reliability/coverage indicator.',
      },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'OpenAQ' },
    });
  }
  console.log(`  ${INDICATORS.length} OpenAQ indicators ensured`);
}

interface OpenAQCountry {
  id: number;
  code: string; // ISO2
  name: string;
}

async function fetchCountries(): Promise<OpenAQCountry[]> {
  console.log(`  Fetching OpenAQ country list...`);
  const { data } = await axios.get(`${API_BASE}/countries`, {
    headers: { 'X-API-Key': API_KEY },
    params: { limit: 200 },
    timeout: 30000,
  });
  const countries: OpenAQCountry[] = data.results || [];
  console.log(`  Got ${countries.length} OpenAQ countries`);
  return countries;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OpenAQ `meta.found` can be:
 *   - a number (exact count)
 *   - a string like ">1000" (approximate, clipped)
 * We parse both gracefully. For ">N" cases we return N (lower bound).
 */
function parseFoundCount(found: unknown): number {
  if (typeof found === 'number') return found;
  if (typeof found === 'string') {
    const num = parseInt(found.replace(/[^0-9]/g, ''), 10);
    return isFinite(num) ? num : 0;
  }
  return 0;
}

async function fetchStationCount(iso2: string, retries = 3): Promise<number> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data } = await axios.get(`${API_BASE}/locations`, {
        headers: { 'X-API-Key': API_KEY },
        // Use limit=1000 so `found` is more likely to be exact; fallback to parsing ">N"
        params: { iso: iso2, limit: 1000 },
        timeout: 20000,
      });
      return parseFoundCount(data.meta?.found);
    } catch (err: any) {
      if (err?.response?.status === 429) {
        // Rate limited — exponential backoff
        const wait = 2000 * Math.pow(2, attempt);
        console.log(`  ⏸ ${iso2}: 429 rate limit, waiting ${wait}ms`);
        await sleep(wait);
        continue;
      }
      console.log(`  ⚠ ${iso2}: ${(err as Error).message.substring(0, 60)}`);
      return 0;
    }
  }
  console.log(`  ⚠ ${iso2}: gave up after ${retries} retries`);
  return 0;
}

async function main() {
  console.log('\n=== WorldLore: OpenAQ Coverage Ingestion ===\n');

  if (!API_KEY) {
    console.error('ERROR: OPENAQ_API_KEY not set in .env');
    process.exit(1);
  }

  await ensureIndicators();

  const countries = await fetchCountries();

  // Build entity lookup
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded\n`);

  const currentYear = new Date().getFullYear();
  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  let matched = 0;
  let skipped = 0;

  console.log(`  Fetching station counts (1 call per country, ~${countries.length * 100}ms rate-limit)...`);

  for (let i = 0; i < countries.length; i++) {
    const c = countries[i];
    const iso3 = ISO2_TO_ISO3[c.code.toUpperCase()];
    if (!iso3) {
      skipped++;
      continue;
    }

    const entityId = iso3ToEntityId[iso3];
    if (!entityId) {
      skipped++;
      continue;
    }

    const count = await fetchStationCount(c.code);

    upsertRows.push({
      id: randomUUID(),
      entityId,
      indicatorCode: 'AQ_STATIONS_COUNT',
      year: currentYear,
      value: count,
      source: 'OpenAQ',
      meta: { countryCode: c.code, countryName: c.name, fetchedAt: new Date().toISOString() },
    });
    matched++;

    // Progress every 25 countries
    if ((i + 1) % 25 === 0) {
      console.log(`    ${i + 1}/${countries.length} — ${c.code}: ${count} stations`);
    }

    // Rate limit: free tier is stricter than docs suggest — use 700ms gap
    await sleep(700);
  }

  console.log(`\n  Matched: ${matched} countries, skipped: ${skipped}`);

  if (upsertRows.length > 0) {
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Upserted ${upsertRows.length} records`);

    // Show coverage distribution
    const buckets = { zero: 0, low: 0, medium: 0, high: 0 };
    for (const r of upsertRows) {
      if (r.value === 0) buckets.zero++;
      else if (r.value < 3) buckets.low++;
      else if (r.value < 10) buckets.medium++;
      else buckets.high++;
    }
    console.log(`\n  Coverage distribution:`);
    console.log(`    0 stations: ${buckets.zero} countries`);
    console.log(`    1-2 stations (too low): ${buckets.low} countries`);
    console.log(`    3-9 stations (limited): ${buckets.medium} countries`);
    console.log(`    10+ stations (good): ${buckets.high} countries`);
  }

  console.log('\n=== OpenAQ Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
