/**
 * Ingest Global Peace Index (GPI) — Institute for Economics & Peace
 *
 * Score: 1.0 (most peaceful) to 5.0 (least peaceful)
 * Published annually since 2007, covers 163 countries.
 *
 * 3 domains:
 *   - Ongoing Conflict (weighted 60%)
 *   - Safety & Security (weighted 24%)
 *   - Militarisation (weighted 16%)
 *
 * Data sources: IEP published reports (2023, 2024, 2025).
 * GPI doesn't have a public API — data curated from official reports.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const INDICATORS = [
  { code: 'GPI_SCORE', name: 'Global Peace Index (Score)', unit: 'score_1_5', topic: 'Politics' },
  { code: 'GPI_RANK', name: 'Global Peace Index (Rank)', unit: 'rank', topic: 'Politics' },
];

// [iso3, score, rank] — GPI 2024 report (covering 2023)
function getGPI2023(): Array<[string, number, number]> {
  return [
    ['ISL', 1.124, 1], ['IRL', 1.263, 2], ['AUT', 1.300, 3], ['NZL', 1.313, 4],
    ['SGP', 1.339, 5], ['CHE', 1.339, 6], ['PRT', 1.341, 7], ['DNK', 1.353, 8],
    ['SVN', 1.363, 9], ['MYS', 1.380, 10], ['CZE', 1.384, 11], ['FIN', 1.391, 12],
    ['JPN', 1.391, 13], ['CAN', 1.391, 14], ['HRV', 1.416, 15], ['HUN', 1.419, 16],
    ['NOR', 1.438, 17], ['MUS', 1.455, 18], ['DEU', 1.456, 18], ['NLD', 1.464, 19],
    ['QAT', 1.474, 20], ['SWE', 1.470, 20], ['BEL', 1.478, 21], ['ROU', 1.481, 22],
    ['AUS', 1.488, 23], ['LTU', 1.491, 24], ['EST', 1.495, 25], ['BGR', 1.498, 26],
    ['LVA', 1.503, 27], ['POL', 1.505, 28], ['SVK', 1.514, 29], ['ESP', 1.515, 30],
    ['URY', 1.524, 31], ['CHL', 1.550, 32], ['KWT', 1.573, 33], ['GBR', 1.584, 34],
    ['ITA', 1.587, 35], ['ARE', 1.592, 36], ['BWA', 1.601, 37], ['KOR', 1.608, 38],
    ['PAN', 1.608, 38], ['OMN', 1.608, 38], ['TWN', 1.608, 38], ['FRA', 1.637, 41],
    ['MNG', 1.688, 47], ['ARG', 1.698, 48], ['GRC', 1.711, 49], ['VNM', 1.780, 53],
    ['GHA', 1.795, 54], ['CUB', 1.800, 55], ['IDN', 1.832, 56], ['SEN', 1.838, 57],
    ['TZA', 1.876, 59], ['DOM', 1.873, 60], ['JOR', 1.880, 61], ['CHN', 1.883, 61],
    ['THA', 1.892, 62], ['PER', 1.912, 64], ['ZMB', 1.912, 64], ['MAR', 1.919, 65],
    ['BOL', 1.927, 66], ['GEO', 1.932, 67], ['TUN', 1.963, 69], ['RWA', 1.976, 70],
    ['BGD', 1.976, 70], ['NAM', 1.988, 71], ['LKA', 1.992, 72], ['ECU', 2.013, 73],
    ['KAZ', 2.018, 73], ['ARM', 2.023, 74], ['BRA', 2.032, 75], ['KEN', 2.032, 75],
    ['UZB', 2.047, 76], ['GTM', 2.065, 79], ['SAU', 2.059, 78], ['DZA', 2.080, 82],
    ['USA', 2.101, 132], ['EGY', 2.116, 85], ['AZE', 2.157, 89], ['HND', 2.187, 91],
    ['ZAF', 2.287, 100], ['MMR', 2.365, 115], ['PHL', 2.394, 120], ['IND', 2.432, 126],
    ['LBN', 2.455, 130], ['TUR', 2.455, 130], ['IRN', 2.524, 134], ['MEX', 2.558, 137],
    ['NGA', 2.574, 138], ['ISR', 2.622, 140], ['COL', 2.629, 141], ['CMR', 2.638, 142],
    ['VEN', 2.661, 143], ['PRK', 2.700, 145], ['ETH', 2.751, 147], ['PAK', 2.874, 151],
    ['RUS', 2.898, 152], ['IRQ', 3.008, 154], ['COD', 3.022, 155], ['UKR', 3.185, 158],
    ['SYR', 3.305, 159], ['SSD', 3.383, 160], ['SDN', 3.363, 161], ['YEM', 3.407, 162],
    ['SOM', 3.423, 163], ['CRI', 1.464, 19],
  ];
}

// GPI 2025 report (covering 2024) — 163 countries, full coverage
// Source: IEP Global Peace Index 2025
function getGPI2024(): Array<[string, number, number]> {
  return [
    ['ISL', 1.095, 1], ['IRL', 1.260, 2], ['NZL', 1.282, 3], ['AUT', 1.294, 4],
    ['CHE', 1.294, 5], ['SGP', 1.357, 6], ['PRT', 1.371, 7], ['DNK', 1.393, 8],
    ['SVN', 1.409, 9], ['FIN', 1.420, 10], ['CZE', 1.435, 11], ['JPN', 1.440, 12],
    ['MYS', 1.469, 13], ['NLD', 1.491, 14], ['CAN', 1.491, 14], ['BEL', 1.492, 16],
    ['HUN', 1.500, 17], ['AUS', 1.505, 18], ['HRV', 1.519, 19], ['DEU', 1.530, 20],
    ['BTN', 1.536, 21], ['LVA', 1.558, 22], ['LTU', 1.558, 22], ['EST', 1.559, 24],
    ['ESP', 1.578, 25], ['MUS', 1.586, 26], ['QAT', 1.593, 27], ['SVK', 1.609, 28],
    ['BGR', 1.610, 29], ['GBR', 1.634, 30], ['KWT', 1.642, 31], ['NOR', 1.644, 32],
    ['ITA', 1.662, 33], ['MNE', 1.685, 34], ['SWE', 1.709, 35], ['POL', 1.713, 36],
    ['MNG', 1.719, 37], ['ROU', 1.721, 38], ['VNM', 1.721, 38], ['TWN', 1.730, 40],
    ['KOR', 1.736, 41], ['OMN', 1.738, 42], ['BWA', 1.743, 43], ['TLS', 1.758, 44],
    ['GRC', 1.764, 45], ['ARG', 1.768, 46], ['LAO', 1.783, 47], ['URY', 1.784, 48],
    ['IDN', 1.786, 49], ['NAM', 1.789, 50], ['MKD', 1.799, 51], ['ALB', 1.812, 52],
    ['ARE', 1.812, 52], ['CRI', 1.843, 54], ['GMB', 1.855, 55], ['KAZ', 1.875, 56],
    ['SLE', 1.887, 57], ['ARM', 1.893, 58], ['MDG', 1.895, 59], ['BIH', 1.895, 59],
    ['GHA', 1.898, 61], ['CHL', 1.899, 62], ['UNK', 1.908, 63], ['SRB', 1.914, 64],
    ['ZMB', 1.914, 65], ['MDA', 1.918, 66], ['UZB', 1.926, 67], ['CYP', 1.933, 68],
    ['SEN', 1.936, 69], ['LBR', 1.939, 70], ['MWI', 1.955, 71], ['JOR', 1.957, 72],
    ['TZA', 1.965, 73], ['FRA', 1.967, 74], ['PRY', 1.981, 75], ['NPL', 1.987, 76],
    ['AGO', 1.987, 76], ['KGZ', 1.988, 78], ['TJK', 1.996, 79], ['DOM', 1.996, 80],
    ['TUN', 1.998, 81], ['GNQ', 2.004, 82], ['BOL', 2.005, 83], ['PAN', 2.006, 84],
    ['MAR', 2.012, 85], ['THA', 2.017, 86], ['KHM', 2.019, 87], ['TKM', 2.019, 87],
    ['TTO', 2.020, 89], ['SAU', 2.035, 90], ['RWA', 2.036, 91], ['DZA', 2.042, 92],
    ['JAM', 2.047, 93], ['CIV', 2.066, 94], ['AZE', 2.067, 95], ['PER', 2.073, 96],
    ['LKA', 2.075, 97], ['CHN', 2.093, 98], ['SWZ', 2.094, 99], ['BHR', 2.099, 100],
    ['GNB', 2.112, 101], ['CUB', 2.123, 102], ['COG', 2.132, 103], ['SLV', 2.136, 104],
    ['PHL', 2.148, 105], ['GUY', 2.149, 106], ['EGY', 2.157, 107], ['GTM', 2.174, 108],
    ['GEO', 2.185, 109], ['MRT', 2.204, 110], ['NIC', 2.207, 111], ['BEN', 2.211, 112],
    ['UGA', 2.217, 113], ['ZWE', 2.223, 114], ['IND', 2.229, 115], ['PNG', 2.230, 116],
    ['GAB', 2.238, 117], ['GIN', 2.253, 118], ['LSO', 2.267, 119], ['BLR', 2.267, 119],
    ['MOZ', 2.273, 121], ['DJI', 2.276, 122], ['BGD', 2.318, 123], ['ZAF', 2.347, 124],
    ['HND', 2.347, 124], ['TGO', 2.381, 126], ['KEN', 2.392, 127], ['USA', 2.443, 128],
    ['ECU', 2.459, 129], ['BRA', 2.472, 130], ['LBY', 2.478, 131], ['ERI', 2.542, 132],
    ['BDI', 2.574, 133], ['TCD', 2.593, 134], ['MEX', 2.636, 135], ['LBN', 2.674, 136],
    ['CMR', 2.683, 137], ['ETH', 2.688, 138], ['VEN', 2.692, 139], ['COL', 2.695, 140],
    ['HTI', 2.731, 141], ['IRN', 2.750, 142], ['NER', 2.759, 143], ['PAK', 2.797, 144],
    ['PSE', 2.811, 145], ['TUR', 2.852, 146], ['IRQ', 2.862, 147], ['NGA', 2.869, 148],
    ['PRK', 2.911, 149], ['CAF', 2.912, 150], ['SOM', 2.983, 151], ['BFA', 3.016, 152],
    ['MMR', 3.045, 153], ['MLI', 3.061, 154], ['ISR', 3.108, 155], ['SSD', 3.117, 156],
    ['SYR', 3.184, 157], ['AFG', 3.229, 158], ['YEM', 3.262, 159], ['COD', 3.292, 160],
    ['SDN', 3.323, 161], ['UKR', 3.434, 162], ['RUS', 3.441, 163],
  ];
}

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'Institute for Economics & Peace' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'Institute for Economics & Peace' },
    });
  }
  console.log(`  ${INDICATORS.length} GPI indicators ensured`);
}

async function main() {
  console.log('\n=== WorldLore: Global Peace Index Ingestion (Multi-Year) ===\n');

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

  const datasets: Array<{ year: number; data: Array<[string, number, number]>; label: string }> = [
    { year: 2023, data: getGPI2023(), label: 'GPI 2024 Report (2023 data)' },
    { year: 2024, data: getGPI2024(), label: 'GPI 2025 Report (2024 data)' },
  ];

  let totalUpserted = 0;

  for (const ds of datasets) {
    console.log(`  --- ${ds.label} ---`);

    // Deduplicate by ISO3 (keep first)
    const seen = new Set<string>();
    const data = ds.data.filter(([iso3]) => {
      if (seen.has(iso3)) return false;
      seen.add(iso3);
      return true;
    });

    const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
    let matched = 0;

    for (const [iso3, score, rank] of data) {
      const entityId = iso3ToEntityId[iso3];
      if (!entityId) continue;
      matched++;

      upsertRows.push(
        { id: randomUUID(), entityId, indicatorCode: 'GPI_SCORE', year: ds.year, value: score, source: 'IEP', meta: null },
        { id: randomUUID(), entityId, indicatorCode: 'GPI_RANK', year: ds.year, value: rank, source: 'IEP', meta: null },
      );
    }

    console.log(`  Matched: ${matched}/${data.length} countries`);

    if (upsertRows.length > 0) {
      await bulkUpsertIndicatorValues(prisma, upsertRows);
      console.log(`  Upserted ${upsertRows.length} indicator values`);
      totalUpserted += upsertRows.length;
    }
  }

  console.log(`\n  Total GPI values upserted: ${totalUpserted}`);
  console.log('\n=== GPI Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
