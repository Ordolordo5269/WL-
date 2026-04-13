/**
 * Ingest OpenSanctions — Real sanctions data from public API
 *
 * Source: OpenSanctions.org aggregates OFAC (USA), EU Consolidated List,
 * OFSI (UK), UN Security Council, Switzerland, Canada, Australia + ~250 more.
 *
 * Data flow:
 * 1. Fetch real country-level sanctions statistics from OpenSanctions bulk data
 *    (public, no API key needed): /datasets/latest/sanctions/statistics.json
 * 2. Create IndicatorValue entries (SANCTION_ENTITY_COUNT) for ML correlation
 * 3. Keep curated top entities per country for the Sanction table (display)
 *
 * The sanctions collection filters to actual sanctioned entities only (not PEPs).
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const STATS_URL = 'https://data.opensanctions.org/datasets/latest/sanctions/statistics.json';

// ISO2 → ISO3 mapping for OpenSanctions (uses ISO2)
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

interface SanctionEntry {
  entityName: string;
  entityType: string;
  countryIso3: string;
  sanctionProgram: string;
  sanctionAuthority: string;
  reason?: string;
  listedAt?: string;
}

async function fetchSanctionsStats(): Promise<Array<{ iso3: string; count: number; label: string }>> {
  console.log('  Fetching OpenSanctions statistics...');
  const { data } = await axios.get(STATS_URL, { timeout: 30000 });

  const countries: Array<{ code: string; count: number; label: string }> = data?.things?.countries || [];
  console.log(`  API returned ${countries.length} country entries`);

  const results: Array<{ iso3: string; count: number; label: string }> = [];

  for (const c of countries) {
    const iso2 = c.code.toUpperCase();
    const iso3 = ISO2_TO_ISO3[iso2];
    if (!iso3 || iso2.length !== 2) continue; // Skip non-country codes (EU, SUHH, etc.)
    results.push({ iso3, count: c.count, label: c.label });
  }

  results.sort((a, b) => b.count - a.count);
  console.log(`  Mapped ${results.length} countries with sanctions data`);
  return results;
}

function getCuratedSanctions(): SanctionEntry[] {
  return [
    // RUSSIA
    { entityName: 'Central Bank of the Russian Federation', entityType: 'organization', countryIso3: 'RUS', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Russia-Ukraine conflict', listedAt: '2022-02-28' },
    { entityName: 'Sberbank', entityType: 'company', countryIso3: 'RUS', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'Russian financial system', listedAt: '2022-02-24' },
    { entityName: 'VTB Bank', entityType: 'company', countryIso3: 'RUS', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Russian financial system', listedAt: '2022-02-24' },
    { entityName: 'Gazprom', entityType: 'company', countryIso3: 'RUS', sanctionProgram: 'EU Consolidated', sanctionAuthority: 'EU', reason: 'Energy sector sanctions', listedAt: '2022-04-08' },
    { entityName: 'Rosneft', entityType: 'company', countryIso3: 'RUS', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'Russian energy sector', listedAt: '2022-02-24' },
    { entityName: 'Vladimir Putin', entityType: 'person', countryIso3: 'RUS', sanctionProgram: 'OFAC SDN / EU / UN', sanctionAuthority: 'OFAC', reason: 'President of Russia', listedAt: '2022-02-25' },
    { entityName: 'Sergei Lavrov', entityType: 'person', countryIso3: 'RUS', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Foreign Minister', listedAt: '2022-02-25' },
    { entityName: 'Wagner Group', entityType: 'organization', countryIso3: 'RUS', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Private military company', listedAt: '2023-01-26' },
    // IRAN
    { entityName: 'Central Bank of Iran', entityType: 'organization', countryIso3: 'IRN', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'Nuclear proliferation', listedAt: '2012-02-06' },
    { entityName: 'Islamic Revolutionary Guard Corps (IRGC)', entityType: 'organization', countryIso3: 'IRN', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Terrorism / nuclear program', listedAt: '2007-10-25' },
    { entityName: 'Ali Khamenei', entityType: 'person', countryIso3: 'IRN', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Supreme Leader', listedAt: '2019-06-24' },
    // NORTH KOREA
    { entityName: 'Korea Workers Party', entityType: 'organization', countryIso3: 'PRK', sanctionProgram: 'OFAC SDN / UN', sanctionAuthority: 'UN', reason: 'Nuclear weapons program', listedAt: '2016-03-02' },
    { entityName: 'Kim Jong Un', entityType: 'person', countryIso3: 'PRK', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Supreme Leader', listedAt: '2016-07-06' },
    // SYRIA
    { entityName: 'Central Bank of Syria', entityType: 'organization', countryIso3: 'SYR', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Syrian civil war', listedAt: '2012-07-31' },
    { entityName: 'Bashar al-Assad', entityType: 'person', countryIso3: 'SYR', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'President', listedAt: '2011-05-18' },
    // CHINA
    { entityName: 'Huawei Technologies', entityType: 'company', countryIso3: 'CHN', sanctionProgram: 'Entity List (BIS)', sanctionAuthority: 'OFAC', reason: 'National security concerns', listedAt: '2019-05-16' },
    { entityName: 'Xinjiang Production and Construction Corps', entityType: 'organization', countryIso3: 'CHN', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'Uyghur human rights', listedAt: '2020-07-31' },
    // VENEZUELA
    { entityName: 'PDVSA', entityType: 'company', countryIso3: 'VEN', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'Oil sector sanctions', listedAt: '2019-01-28' },
    { entityName: 'Nicolás Maduro', entityType: 'person', countryIso3: 'VEN', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'President', listedAt: '2017-07-31' },
    // MYANMAR
    { entityName: 'Min Aung Hlaing', entityType: 'person', countryIso3: 'MMR', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'OFAC', reason: 'Military coup leader', listedAt: '2021-02-11' },
    // BELARUS
    { entityName: 'Alexander Lukashenko', entityType: 'person', countryIso3: 'BLR', sanctionProgram: 'OFAC SDN / EU', sanctionAuthority: 'EU', reason: 'Election fraud / repression', listedAt: '2020-11-06' },
    // SUDAN
    { entityName: 'Rapid Support Forces (RSF)', entityType: 'organization', countryIso3: 'SDN', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'Sudan civil war', listedAt: '2023-06-01' },
    // CUBA
    { entityName: 'Government of Cuba', entityType: 'organization', countryIso3: 'CUB', sanctionProgram: 'OFAC (embargo)', sanctionAuthority: 'OFAC', reason: 'Comprehensive embargo', listedAt: '1962-02-07' },
    // SOMALIA
    { entityName: 'Al-Shabaab', entityType: 'organization', countryIso3: 'SOM', sanctionProgram: 'OFAC SDN / UN', sanctionAuthority: 'UN', reason: 'Terrorism', listedAt: '2008-04-12' },
    // YEMEN
    { entityName: 'Ansar Allah (Houthis)', entityType: 'organization', countryIso3: 'YEM', sanctionProgram: 'OFAC SDN', sanctionAuthority: 'OFAC', reason: 'Armed conflict / shipping attacks', listedAt: '2024-01-17' },
    // AFGHANISTAN
    { entityName: 'Taliban', entityType: 'organization', countryIso3: 'AFG', sanctionProgram: 'OFAC SDN / UN', sanctionAuthority: 'UN', reason: 'De facto government', listedAt: '1999-11-14' },
  ];
}

async function main() {
  console.log('\n=== WorldLore: OpenSanctions Ingestion (Real API + Curated) ===\n');

  // Step 1: Ensure indicator for ML
  await prisma.indicator.upsert({
    where: { code: 'SANCTION_ENTITY_COUNT' },
    create: {
      code: 'SANCTION_ENTITY_COUNT',
      name: 'Sanctioned Entities (Count)',
      topic: 'Politics',
      unit: 'count',
      source: 'OpenSanctions',
      description: 'Number of sanctioned entities (persons, companies, organizations) associated with this country across all major sanctions lists (OFAC, EU, UN, etc.)',
    },
    update: {
      name: 'Sanctioned Entities (Count)',
      source: 'OpenSanctions',
    },
  });
  console.log('  SANCTION_ENTITY_COUNT indicator ensured');

  // Step 2: Fetch real sanctions statistics from OpenSanctions
  let sanctionStats: Array<{ iso3: string; count: number; label: string }> = [];
  try {
    sanctionStats = await fetchSanctionsStats();
  } catch (err) {
    console.log(`  ERROR fetching stats: ${(err as Error).message.substring(0, 80)}`);
    console.log('  Continuing with curated data only');
  }

  // Step 3: Create IndicatorValue entries for ML
  if (sanctionStats.length > 0) {
    const entities = await prisma.entity.findMany({
      where: { type: 'COUNTRY', iso3: { not: null } },
      select: { id: true, iso3: true },
    });
    const iso3ToEntityId: Record<string, string> = {};
    for (const e of entities) {
      iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
    }

    const year = new Date().getFullYear();
    const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];

    for (const stat of sanctionStats) {
      const entityId = iso3ToEntityId[stat.iso3];
      if (!entityId) continue;

      upsertRows.push({
        id: randomUUID(),
        entityId,
        indicatorCode: 'SANCTION_ENTITY_COUNT',
        year,
        value: stat.count,
        source: 'OpenSanctions',
        meta: { label: stat.label, fetchedAt: new Date().toISOString() },
      });
    }

    if (upsertRows.length > 0) {
      await bulkUpsertIndicatorValues(prisma, upsertRows);
      console.log(`  Upserted ${upsertRows.length} SANCTION_ENTITY_COUNT indicator values`);
    }
  }

  // Step 4: Upsert curated sanctions for the Sanction table (display/detail)
  const entries = getCuratedSanctions();
  console.log(`\n  Upserting ${entries.length} curated sanction entries...`);

  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const sourceId = `wl-${entry.countryIso3}-${entry.entityName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 60)}`;

    const existing = await prisma.sanction.findUnique({ where: { sourceId } });

    if (existing) {
      await prisma.sanction.update({
        where: { sourceId },
        data: {
          entityName: entry.entityName,
          entityType: entry.entityType,
          countryIso3: entry.countryIso3,
          sanctionProgram: entry.sanctionProgram,
          sanctionAuthority: entry.sanctionAuthority,
          reason: entry.reason,
          listedAt: entry.listedAt ? new Date(entry.listedAt) : null,
          isActive: true,
          syncedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.sanction.create({
        data: {
          id: randomUUID(),
          entityName: entry.entityName,
          entityType: entry.entityType,
          countryIso3: entry.countryIso3,
          sanctionProgram: entry.sanctionProgram,
          sanctionAuthority: entry.sanctionAuthority,
          reason: entry.reason,
          listedAt: entry.listedAt ? new Date(entry.listedAt) : null,
          isActive: true,
          sourceId,
          syncedAt: new Date(),
        },
      });
      created++;
    }
  }

  console.log(`  Curated: Created ${created}, Updated ${updated}`);

  // Summary
  const byCounry = await prisma.sanction.groupBy({
    by: ['countryIso3'],
    _count: true,
    where: { isActive: true },
    orderBy: { _count: { countryIso3: 'desc' } },
  });
  console.log('\n  Sanctions by country (curated):');
  for (const row of byCounry) {
    console.log(`    ${row.countryIso3}: ${row._count} entities`);
  }

  if (sanctionStats.length > 0) {
    console.log('\n  Top 15 sanctioned countries (real API data):');
    for (const stat of sanctionStats.slice(0, 15)) {
      console.log(`    ${stat.iso3}: ${stat.count.toLocaleString()} entities (${stat.label})`);
    }
  }

  console.log('\n=== OpenSanctions Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
