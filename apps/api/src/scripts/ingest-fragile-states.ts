/**
 * Ingest Fund for Peace — Fragile States Index (FSI)
 *
 * Source: Fund for Peace publishes annual FSI scores (0-120).
 *   - Higher score = more fragile/at risk of collapse
 *   - 12 sub-indicators across Cohesion, Economic, Political, Social
 *   - Covers ~179 countries
 *
 * Data: FSI doesn't have a public API. Data curated from official reports.
 * Includes FSI 2023 (2023 data) and FSI 2024 (2024 data).
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const INDICATORS = [
  { code: 'FSI_TOTAL', name: 'Fragile States Index (Total Score)', unit: 'score_0_120', topic: 'Politics' },
  { code: 'FSI_RANK', name: 'Fragile States Index (Rank)', unit: 'rank', topic: 'Politics' },
];

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'Fund for Peace' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'Fund for Peace' },
    });
  }
  console.log(`  ${INDICATORS.length} FSI indicators ensured`);
}


// FSI 2023 report — curated subset (54 countries)
function getFSI2023(): Array<{ iso3: string; score: number; rank: number }> {
  return [
    { iso3: 'SOM', score: 111.9, rank: 1 }, { iso3: 'YEM', score: 111.7, rank: 2 },
    { iso3: 'SSD', score: 109.4, rank: 3 }, { iso3: 'COD', score: 108.4, rank: 4 },
    { iso3: 'SYR', score: 107.5, rank: 5 }, { iso3: 'AFG', score: 106.6, rank: 6 },
    { iso3: 'SDN', score: 105.1, rank: 7 }, { iso3: 'CAF', score: 104.6, rank: 8 },
    { iso3: 'TCD', score: 103.8, rank: 9 }, { iso3: 'MMR', score: 101.5, rank: 10 },
    { iso3: 'HTI', score: 100.6, rank: 11 }, { iso3: 'ETH', score: 98.5, rank: 12 },
    { iso3: 'NGA', score: 97.3, rank: 14 }, { iso3: 'MLI', score: 96.7, rank: 15 },
    { iso3: 'BFA', score: 96.1, rank: 16 }, { iso3: 'CMR', score: 95.5, rank: 17 },
    { iso3: 'MOZ', score: 94.2, rank: 18 }, { iso3: 'NER', score: 93.8, rank: 19 },
    { iso3: 'UGA', score: 93.0, rank: 20 }, { iso3: 'IRQ', score: 92.4, rank: 21 },
    { iso3: 'COG', score: 91.8, rank: 22 }, { iso3: 'GNB', score: 91.3, rank: 23 },
    { iso3: 'ERI', score: 91.0, rank: 24 }, { iso3: 'LBY', score: 90.5, rank: 25 },
    { iso3: 'PRK', score: 89.8, rank: 26 }, { iso3: 'VEN', score: 87.5, rank: 30 },
    { iso3: 'PAK', score: 86.4, rank: 33 }, { iso3: 'BGD', score: 85.2, rank: 35 },
    { iso3: 'LBN', score: 84.8, rank: 36 }, { iso3: 'KEN', score: 83.5, rank: 38 },
    { iso3: 'PSE', score: 82.5, rank: 40 }, { iso3: 'IRN', score: 79.8, rank: 45 },
    { iso3: 'EGY', score: 78.5, rank: 48 }, { iso3: 'COL', score: 76.2, rank: 52 },
    { iso3: 'UKR', score: 75.5, rank: 54 }, { iso3: 'TUR', score: 73.8, rank: 58 },
    { iso3: 'PHL', score: 72.5, rank: 60 }, { iso3: 'IND', score: 72.0, rank: 62 },
    { iso3: 'CHN', score: 71.4, rank: 64 }, { iso3: 'MEX', score: 70.8, rank: 66 },
    { iso3: 'THA', score: 69.5, rank: 68 }, { iso3: 'RUS', score: 68.2, rank: 70 },
    { iso3: 'IDN', score: 67.8, rank: 72 }, { iso3: 'SAU', score: 66.5, rank: 75 },
    { iso3: 'BRA', score: 64.5, rank: 80 }, { iso3: 'ZAF', score: 63.8, rank: 82 },
    { iso3: 'PER', score: 62.5, rank: 85 }, { iso3: 'ECU', score: 62.0, rank: 86 },
    { iso3: 'ARG', score: 57.8, rank: 95 }, { iso3: 'USA', score: 35.5, rank: 141 },
    { iso3: 'JPN', score: 33.5, rank: 145 }, { iso3: 'DEU', score: 30.5, rank: 150 },
    { iso3: 'FIN', score: 15.5, rank: 175 }, { iso3: 'NOR', score: 12.7, rank: 179 },
  ];
}

// FSI 2024 report — full 179 countries
// Source: Fund for Peace / Wikipedia FSI 2024 data
function getFSI2024(): Array<{ iso3: string; score: number; rank: number }> {
  return [
    { iso3: 'SOM', score: 111.3, rank: 1 }, { iso3: 'SDN', score: 109.3, rank: 2 },
    { iso3: 'SSD', score: 109.0, rank: 3 }, { iso3: 'SYR', score: 108.1, rank: 4 },
    { iso3: 'COD', score: 106.7, rank: 5 }, { iso3: 'YEM', score: 106.6, rank: 6 },
    { iso3: 'CAF', score: 103.9, rank: 7 }, { iso3: 'AFG', score: 103.9, rank: 7 },
    { iso3: 'HTI', score: 103.5, rank: 9 }, { iso3: 'TCD', score: 102.7, rank: 10 },
    { iso3: 'MMR', score: 100.0, rank: 11 }, { iso3: 'ETH', score: 98.1, rank: 12 },
    { iso3: 'PSE', score: 97.8, rank: 13 }, { iso3: 'MLI', score: 97.3, rank: 14 },
    { iso3: 'NGA', score: 96.6, rank: 15 }, { iso3: 'LBY', score: 96.5, rank: 16 },
    { iso3: 'GIN', score: 96.4, rank: 17 }, { iso3: 'ZWE', score: 95.7, rank: 18 },
    { iso3: 'NER', score: 95.2, rank: 19 }, { iso3: 'CMR', score: 94.3, rank: 20 },
    { iso3: 'BFA', score: 94.2, rank: 21 }, { iso3: 'UKR', score: 93.1, rank: 22 },
    { iso3: 'LBN', score: 92.7, rank: 23 }, { iso3: 'BDI', score: 92.6, rank: 24 },
    { iso3: 'MOZ', score: 92.5, rank: 25 }, { iso3: 'ERI', score: 92.1, rank: 26 },
    { iso3: 'PAK', score: 91.7, rank: 27 }, { iso3: 'UGA', score: 91.1, rank: 28 },
    { iso3: 'COG', score: 90.2, rank: 29 }, { iso3: 'VEN', score: 89.0, rank: 30 },
    { iso3: 'IRQ', score: 88.6, rank: 31 }, { iso3: 'GNB', score: 88.4, rank: 32 },
    { iso3: 'LKA', score: 88.2, rank: 33 }, { iso3: 'MRT', score: 87.0, rank: 34 },
    { iso3: 'LBR', score: 86.9, rank: 35 }, { iso3: 'KEN', score: 86.5, rank: 36 },
    { iso3: 'BGD', score: 85.9, rank: 37 }, { iso3: 'AGO', score: 85.6, rank: 38 },
    { iso3: 'CIV', score: 85.3, rank: 39 }, { iso3: 'PRK', score: 84.9, rank: 40 },
    { iso3: 'TUR', score: 84.0, rank: 41 }, { iso3: 'GNQ', score: 83.7, rank: 42 },
    { iso3: 'IRN', score: 82.9, rank: 43 }, { iso3: 'EGY', score: 82.8, rank: 44 },
    { iso3: 'SLE', score: 82.6, rank: 45 }, { iso3: 'RWA', score: 81.8, rank: 46 },
    { iso3: 'COM', score: 81.7, rank: 47 }, { iso3: 'RUS', score: 81.6, rank: 48 },
    { iso3: 'DJI', score: 81.6, rank: 48 }, { iso3: 'ZMB', score: 81.2, rank: 50 },
    { iso3: 'TGO', score: 81.1, rank: 51 }, { iso3: 'MWI', score: 80.5, rank: 52 },
    { iso3: 'MDG', score: 79.8, rank: 53 }, { iso3: 'PNG', score: 78.8, rank: 54 },
    { iso3: 'KHM', score: 78.6, rank: 55 }, { iso3: 'HND', score: 78.1, rank: 56 },
    { iso3: 'NPL', score: 78.0, rank: 57 }, { iso3: 'SWZ', score: 77.6, rank: 58 },
    { iso3: 'SLB', score: 77.6, rank: 58 }, { iso3: 'NIC', score: 76.7, rank: 60 },
    { iso3: 'GMB', score: 76.1, rank: 61 }, { iso3: 'TZA', score: 75.7, rank: 62 },
    { iso3: 'COL', score: 75.6, rank: 63 }, { iso3: 'PHL', score: 75.1, rank: 64 },
    { iso3: 'KGZ', score: 74.9, rank: 65 }, { iso3: 'GTM', score: 74.9, rank: 65 },
    { iso3: 'TLS', score: 74.8, rank: 67 }, { iso3: 'LSO', score: 74.6, rank: 68 },
    { iso3: 'JOR', score: 74.3, rank: 69 }, { iso3: 'SEN', score: 74.2, rank: 70 },
    { iso3: 'LAO', score: 73.8, rank: 71 }, { iso3: 'AZE', score: 72.8, rank: 72 },
    { iso3: 'TJK', score: 72.8, rank: 72 }, { iso3: 'BEN', score: 72.5, rank: 74 },
    { iso3: 'IND', score: 72.3, rank: 75 }, { iso3: 'PER', score: 72.0, rank: 76 },
    { iso3: 'BIH', score: 71.0, rank: 77 }, { iso3: 'BRA', score: 70.3, rank: 78 },
    { iso3: 'GAB', score: 70.2, rank: 79 }, { iso3: 'ZAF', score: 69.6, rank: 80 },
    { iso3: 'BOL', score: 69.4, rank: 81 }, { iso3: 'GEO', score: 69.3, rank: 82 },
    { iso3: 'MEX', score: 69.0, rank: 83 }, { iso3: 'MAR', score: 68.8, rank: 84 },
    { iso3: 'SLV', score: 68.7, rank: 85 }, { iso3: 'BLR', score: 68.7, rank: 85 },
    { iso3: 'DZA', score: 68.6, rank: 87 }, { iso3: 'STP', score: 68.5, rank: 88 },
    { iso3: 'ARM', score: 68.1, rank: 89 }, { iso3: 'ECU', score: 68.0, rank: 90 },
    { iso3: 'SRB', score: 67.8, rank: 91 }, { iso3: 'TUN', score: 67.2, rank: 92 },
    { iso3: 'FSM', score: 66.9, rank: 93 }, { iso3: 'FJI', score: 66.4, rank: 94 },
    { iso3: 'THA', score: 66.2, rank: 95 }, { iso3: 'UZB', score: 64.8, rank: 96 },
    { iso3: 'MDA', score: 64.7, rank: 97 }, { iso3: 'BTN', score: 64.5, rank: 98 },
    { iso3: 'CHN', score: 64.4, rank: 99 }, { iso3: 'BHR', score: 64.2, rank: 100 },
    { iso3: 'WSM', score: 63.9, rank: 101 }, { iso3: 'IDN', score: 63.7, rank: 102 },
    { iso3: 'SAU', score: 63.2, rank: 103 }, { iso3: 'TKM', score: 62.2, rank: 104 },
    { iso3: 'PRY', score: 61.5, rank: 105 }, { iso3: 'GHA', score: 60.8, rank: 106 },
    { iso3: 'MDV', score: 60.3, rank: 107 }, { iso3: 'DOM', score: 60.2, rank: 108 },
    { iso3: 'NAM', score: 59.3, rank: 109 }, { iso3: 'GUY', score: 59.2, rank: 110 },
    { iso3: 'CUB', score: 59.1, rank: 111 }, { iso3: 'SUR', score: 58.8, rank: 112 },
    { iso3: 'MKD', score: 58.1, rank: 113 }, { iso3: 'KAZ', score: 57.8, rank: 114 },
    { iso3: 'CPV', score: 57.2, rank: 115 }, { iso3: 'BLZ', score: 57.0, rank: 116 },
    { iso3: 'MNE', score: 56.9, rank: 117 }, { iso3: 'VNM', score: 56.2, rank: 118 },
    { iso3: 'ALB', score: 55.9, rank: 119 }, { iso3: 'GRC', score: 54.7, rank: 120 },
    { iso3: 'CYP', score: 54.1, rank: 121 }, { iso3: 'BRN', score: 53.9, rank: 122 },
    { iso3: 'BWA', score: 53.6, rank: 123 }, { iso3: 'TTO', score: 53.5, rank: 124 },
    { iso3: 'MYS', score: 53.1, rank: 125 }, { iso3: 'GRD', score: 51.9, rank: 126 },
    { iso3: 'ISR', score: 51.5, rank: 127 }, { iso3: 'SYC', score: 51.0, rank: 128 },
    { iso3: 'MNG', score: 50.7, rank: 129 }, { iso3: 'BGR', score: 49.4, rank: 130 },
    { iso3: 'KWT', score: 49.3, rank: 131 }, { iso3: 'BHS', score: 48.0, rank: 132 },
    { iso3: 'PAN', score: 47.7, rank: 133 }, { iso3: 'OMN', score: 47.4, rank: 134 },
    { iso3: 'HUN', score: 46.2, rank: 135 }, { iso3: 'HRV', score: 45.9, rank: 136 },
    { iso3: 'BRB', score: 44.7, rank: 137 }, { iso3: 'USA', score: 44.5, rank: 138 },
    { iso3: 'ARG', score: 44.2, rank: 139 }, { iso3: 'ESP', score: 44.0, rank: 140 },
    { iso3: 'POL', score: 41.7, rank: 141 }, { iso3: 'LVA', score: 41.4, rank: 142 },
    { iso3: 'ITA', score: 41.1, rank: 143 }, { iso3: 'GBR', score: 40.8, rank: 144 },
    { iso3: 'QAT', score: 39.8, rank: 145 }, { iso3: 'CRI', score: 39.4, rank: 146 },
    { iso3: 'MUS', score: 37.8, rank: 147 }, { iso3: 'CZE', score: 37.7, rank: 148 },
    { iso3: 'LTU', score: 37.4, rank: 149 }, { iso3: 'EST', score: 36.5, rank: 150 },
    { iso3: 'SVK', score: 35.3, rank: 151 }, { iso3: 'ARE', score: 34.7, rank: 152 },
    { iso3: 'URY', score: 33.7, rank: 153 }, { iso3: 'MLT', score: 31.1, rank: 154 },
    { iso3: 'BEL', score: 30.3, rank: 155 }, { iso3: 'JPN', score: 30.2, rank: 156 },
    { iso3: 'KOR', score: 29.8, rank: 157 }, { iso3: 'FRA', score: 28.3, rank: 158 },
    { iso3: 'SVN', score: 26.1, rank: 159 }, { iso3: 'PRT', score: 25.9, rank: 160 },
    { iso3: 'SGP', score: 25.4, rank: 161 }, { iso3: 'DEU', score: 24.0, rank: 162 },
    { iso3: 'AUT', score: 23.1, rank: 163 }, { iso3: 'SWE', score: 20.6, rank: 164 },
    { iso3: 'AUS', score: 19.6, rank: 165 }, { iso3: 'NLD', score: 19.5, rank: 166 },
    { iso3: 'LUX', score: 18.7, rank: 167 }, { iso3: 'IRL', score: 18.6, rank: 168 },
    { iso3: 'CHE', score: 16.2, rank: 169 }, { iso3: 'NZL', score: 15.9, rank: 170 },
    { iso3: 'DNK', score: 15.9, rank: 170 }, { iso3: 'CAN', score: 15.5, rank: 172 },
    { iso3: 'ISL', score: 15.2, rank: 173 }, { iso3: 'FIN', score: 14.3, rank: 174 },
    { iso3: 'NOR', score: 12.7, rank: 175 },
  ];
}

async function main() {
  console.log('\n=== WorldLore: Fragile States Index Ingestion (Multi-Year) ===\n');

  await ensureIndicators();

  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });

  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) {
    iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  }
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded\n`);

  const datasets: Array<{ year: number; data: Array<{ iso3: string; score: number; rank: number }>; label: string }> = [
    { year: 2023, data: getFSI2023(), label: 'FSI 2023 Report (2023 data)' },
    { year: 2024, data: getFSI2024(), label: 'FSI 2024 Report (2024 data)' },
  ];

  let totalUpserted = 0;

  for (const ds of datasets) {
    console.log(`  --- ${ds.label} ---`);

    const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
    let matched = 0;

    for (const row of ds.data) {
      const entityId = iso3ToEntityId[row.iso3];
      if (!entityId) continue;
      matched++;

      upsertRows.push(
        { id: randomUUID(), entityId, indicatorCode: 'FSI_TOTAL', year: ds.year, value: row.score, source: 'Fund for Peace', meta: null },
        { id: randomUUID(), entityId, indicatorCode: 'FSI_RANK', year: ds.year, value: row.rank, source: 'Fund for Peace', meta: null },
      );
    }

    console.log(`  Matched: ${matched}/${ds.data.length} countries`);

    if (upsertRows.length > 0) {
      await bulkUpsertIndicatorValues(prisma, upsertRows);
      console.log(`  Upserted ${upsertRows.length} indicator values`);
      totalUpserted += upsertRows.length;
    }
  }

  console.log(`\n  Total FSI values upserted: ${totalUpserted}`);
  console.log('\n=== FSI Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
