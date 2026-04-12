/**
 * Ingest World Risk Index (WRI)
 *
 * Source: Bündnis Entwicklung Hilft / IFHV Bochum
 * Annual composite index of natural hazard risk (exposure + vulnerability).
 *
 * Data: WRI 2022 (most recent curated from published report).
 * Note: the Wikipedia table reports the index as percentages; we store the
 * numeric score as-is (0-100 scale) for ML simplicity.
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { bulkUpsertIndicatorValues } from './lib/bulk-upsert';

const prisma = new PrismaClient();

const INDICATORS = [
  { code: 'WRI_SCORE', name: 'World Risk Index (Score)', unit: 'score_0_100', topic: 'Environment' },
  { code: 'WRI_RANK',  name: 'World Risk Index (Rank)',  unit: 'rank',        topic: 'Environment' },
];

const NAME_TO_ISO3: Record<string, string> = {
  'Andorra': 'AND', 'Monaco': 'MCO', 'San Marino': 'SMR', 'São Tomé and Príncipe': 'STP',
  'Luxembourg': 'LUX', 'Liechtenstein': 'LIE', 'Singapore': 'SGP', 'Belarus': 'BLR',
  'Malta': 'MLT', 'Bahrain': 'BHR', 'Hungary': 'HUN', 'Czechia': 'CZE', 'Nauru': 'NRU',
  'Slovakia': 'SVK', 'Maldives': 'MDV', 'Denmark': 'DNK', 'Switzerland': 'CHE',
  'Bhutan': 'BTN', 'Austria': 'AUT', 'Qatar': 'QAT', 'Palau': 'PLW', 'North Macedonia': 'MKD',
  'Cape Verde': 'CPV', 'Turkmenistan': 'TKM', 'Finland': 'FIN', 'Moldova': 'MDA',
  'Lesotho': 'LSO', 'Togo': 'TGO', 'Brunei': 'BRN', 'Botswana': 'BWA', 'Slovenia': 'SVN',
  'Tuvalu': 'TUV', 'Benin': 'BEN', 'Iceland': 'ISL', 'Paraguay': 'PRY', 'Uzbekistan': 'UZB',
  'Estonia': 'EST', 'Eswatini': 'SWZ', 'Serbia': 'SRB', 'Grenada': 'GRD', 'Barbados': 'BRB',
  'Burkina Faso': 'BFA', 'Sweden': 'SWE', 'Saint Kitts and Nevis': 'KNA', 'Ivory Coast': 'CIV',
  'Mongolia': 'MNG', 'Latvia': 'LVA', 'Bulgaria': 'BGR', 'Niger': 'NER', 'Kazakhstan': 'KAZ',
  'Azerbaijan': 'AZE', 'Kyrgyzstan': 'KGZ', 'Lithuania': 'LTU', 'Mali': 'MLI',
  'Marshall Islands': 'MHL', 'Saint Vincent and the Grenadines': 'VCT', 'Tajikistan': 'TJK',
  'Zimbabwe': 'ZWE', 'Bosnia and Herzegovina': 'BIH', 'Seychelles': 'SYC', 'Comoros': 'COM',
  'Kuwait': 'KWT', 'Nepal': 'NPL', 'Kiribati': 'KIR', 'Saint Lucia': 'LCA', 'Rwanda': 'RWA',
  'Armenia': 'ARM', 'Cyprus': 'CYP', 'Uganda': 'UGA', 'Laos': 'LAO', 'Chad': 'TCD',
  'Trinidad and Tobago': 'TTO', 'Zambia': 'ZMB', 'Burundi': 'BDI', 'Ghana': 'GHA',
  'Bolivia': 'BOL', 'Ireland': 'IRL', 'Samoa': 'WSM', 'Norway': 'NOR', 'Romania': 'ROU',
  'Dominica': 'DMA', 'Malawi': 'MWI', 'Montenegro': 'MNE', 'Central African Republic': 'CAF',
  'Equatorial Guinea': 'GNQ', 'Jordan': 'JOR', 'Mauritius': 'MUS', 'Lebanon': 'LBN',
  'Bahamas': 'BHS', 'Georgia': 'GEO', 'Antigua and Barbuda': 'ATG', 'Ukraine': 'UKR',
  'Germany': 'DEU', 'Tonga': 'TON', 'Netherlands': 'NLD', 'Afghanistan': 'AFG',
  'Liberia': 'LBR', 'Guinea-Bissau': 'GNB', 'Belgium': 'BEL', 'South Sudan': 'SSD',
  'Micronesia': 'FSM', 'Gambia': 'GMB', 'Poland': 'POL', 'Israel': 'ISR', 'Jamaica': 'JAM',
  'Gabon': 'GAB', 'Ethiopia': 'ETH', 'Congo': 'COG', 'Croatia': 'HRV', 'Suriname': 'SUR',
  'Uruguay': 'URY', 'Albania': 'ALB', 'Sierra Leone': 'SLE', 'Portugal': 'PRT',
  'Senegal': 'SEN', 'United Kingdom': 'GBR', 'Namibia': 'NAM', 'Sri Lanka': 'LKA',
  'United Arab Emirates': 'ARE', 'Fiji': 'FJI', 'Guyana': 'GUY', 'France': 'FRA',
  'Guinea': 'GIN', 'Oman': 'OMN', 'Belize': 'BLZ', 'Eritrea': 'ERI', 'Cuba': 'CUB',
  'East Timor': 'TLS', 'Cambodia': 'KHM', 'Greece': 'GRC', 'Iraq': 'IRQ', 'Nigeria': 'NGA',
  'Mauritania': 'MRT', 'Italy': 'ITA', 'South Africa': 'ZAF', 'Algeria': 'DZA',
  'Saudi Arabia': 'SAU', 'DR Congo': 'COD', 'Spain': 'ESP', 'Tunisia': 'TUN', 'Haiti': 'HTI',
  'Sudan': 'SDN', 'Morocco': 'MAR', 'South Korea': 'KOR', 'Vanuatu': 'VUT',
  'Djibouti': 'DJI', 'Angola': 'AGO', 'Cameroon': 'CMR', 'Guatemala': 'GTM',
  'North Korea': 'PRK', 'Brazil': 'BRA', 'Syria': 'SYR', 'New Zealand': 'NZL',
  'Dominican Republic': 'DOM', 'Chile': 'CHL', 'Kenya': 'KEN', 'Costa Rica': 'CRI',
  'Libya': 'LBY', 'Malaysia': 'MYS', 'El Salvador': 'SLV', 'Solomon Islands': 'SLB',
  'Argentina': 'ARG', 'Honduras': 'HND', 'Turkey': 'TUR', 'Tanzania': 'TZA', 'Japan': 'JPN',
  'Panama': 'PAN', 'Iran': 'IRN', 'Canada': 'CAN', 'Egypt': 'EGY', 'Thailand': 'THA',
  'Australia': 'AUS', 'Nicaragua': 'NIC', 'Ecuador': 'ECU', 'Venezuela': 'VEN',
  'United States': 'USA', 'Madagascar': 'MDG', 'Papua New Guinea': 'PNG', 'Yemen': 'YEM',
  'Somalia': 'SOM', 'Peru': 'PER', 'Vietnam': 'VNM', 'Russia': 'RUS', 'Pakistan': 'PAK',
  'Bangladesh': 'BGD', 'China': 'CHN', 'Mozambique': 'MOZ', 'Myanmar': 'MMR',
  'Mexico': 'MEX', 'Colombia': 'COL', 'Indonesia': 'IDN', 'India': 'IND', 'Philippines': 'PHL',
};

// WRI 2022 data — from published Bündnis Entwicklung Hilft report
// Format: [country_name, rank, score]
function getWRI2022(): Array<[string, number, number]> {
  return [
    ['Andorra', 1, 0.26], ['Monaco', 1, 0.26], ['San Marino', 2, 0.38],
    ['São Tomé and Príncipe', 3, 0.48], ['Luxembourg', 4, 0.52], ['Liechtenstein', 5, 0.79],
    ['Singapore', 6, 0.81], ['Belarus', 7, 0.83], ['Malta', 8, 0.94], ['Bahrain', 9, 0.95],
    ['Hungary', 10, 0.97], ['Czechia', 11, 1.00], ['Nauru', 11, 1.00], ['Slovakia', 11, 1.00],
    ['Maldives', 12, 1.02], ['Denmark', 13, 1.03], ['Switzerland', 13, 1.03], ['Bhutan', 14, 1.09],
    ['Austria', 15, 1.14], ['Qatar', 16, 1.17], ['Palau', 17, 1.25], ['North Macedonia', 18, 1.26],
    ['Cape Verde', 19, 1.27], ['Turkmenistan', 20, 1.29], ['Finland', 21, 1.30], ['Moldova', 21, 1.30],
    ['Lesotho', 22, 1.32], ['Togo', 22, 1.32], ['Brunei', 23, 1.34], ['Botswana', 24, 1.44],
    ['Slovenia', 24, 1.44], ['Tuvalu', 25, 1.46], ['Benin', 26, 1.61], ['Iceland', 27, 1.65],
    ['Paraguay', 28, 1.74], ['Uzbekistan', 28, 1.74], ['Estonia', 29, 1.82], ['Eswatini', 29, 1.82],
    ['Serbia', 30, 1.84], ['Grenada', 31, 1.85], ['Barbados', 32, 2.06], ['Burkina Faso', 32, 2.06],
    ['Sweden', 32, 2.06], ['Saint Kitts and Nevis', 33, 2.07], ['Ivory Coast', 34, 2.08],
    ['Mongolia', 34, 2.08], ['Latvia', 35, 2.14], ['Bulgaria', 36, 2.15], ['Niger', 37, 2.17],
    ['Kazakhstan', 38, 2.18], ['Azerbaijan', 39, 2.20], ['Kyrgyzstan', 39, 2.20],
    ['Lithuania', 40, 2.24], ['Mali', 41, 2.25], ['Marshall Islands', 42, 2.29],
    ['Saint Vincent and the Grenadines', 43, 2.30], ['Tajikistan', 44, 2.38], ['Zimbabwe', 45, 2.44],
    ['Bosnia and Herzegovina', 46, 2.51], ['Seychelles', 47, 2.54], ['Comoros', 48, 2.56],
    ['Kuwait', 48, 2.56], ['Nepal', 49, 2.62], ['Kiribati', 50, 2.64], ['Saint Lucia', 51, 2.69],
    ['Rwanda', 52, 2.70], ['Armenia', 53, 2.72], ['Cyprus', 54, 2.78], ['Uganda', 55, 2.81],
    ['Laos', 56, 2.91], ['Chad', 57, 2.92], ['Trinidad and Tobago', 58, 2.93], ['Zambia', 59, 2.94],
    ['Burundi', 60, 3.03], ['Ghana', 61, 3.05], ['Bolivia', 62, 3.07], ['Ireland', 63, 3.10],
    ['Samoa', 64, 3.15], ['Norway', 65, 3.16], ['Romania', 66, 3.19], ['Dominica', 67, 3.27],
    ['Malawi', 68, 3.30], ['Montenegro', 68, 3.30], ['Central African Republic', 69, 3.34],
    ['Equatorial Guinea', 70, 3.36], ['Jordan', 71, 3.48], ['Mauritius', 72, 3.50],
    ['Lebanon', 73, 3.52], ['Bahamas', 74, 3.75], ['Georgia', 85, 3.79],
    ['Antigua and Barbuda', 86, 3.84], ['Ukraine', 87, 3.89], ['Germany', 88, 3.92],
    ['Tonga', 89, 3.94], ['Netherlands', 90, 4.04], ['Afghanistan', 91, 4.05],
    ['Liberia', 92, 4.11], ['Guinea-Bissau', 93, 4.14], ['Belgium', 94, 4.16],
    ['South Sudan', 95, 4.21], ['Micronesia', 96, 4.36], ['Gambia', 97, 4.45],
    ['Poland', 98, 4.63], ['Israel', 99, 4.65], ['Jamaica', 99, 4.65], ['Gabon', 100, 4.72],
    ['Ethiopia', 101, 4.80], ['Congo', 102, 4.85], ['Croatia', 103, 4.86], ['Suriname', 104, 4.87],
    ['Uruguay', 105, 4.92], ['Albania', 106, 4.98], ['Sierra Leone', 107, 5.00],
    ['Portugal', 108, 5.08], ['Senegal', 109, 5.42], ['United Kingdom', 110, 5.78],
    ['Namibia', 111, 5.93], ['Sri Lanka', 111, 5.93], ['United Arab Emirates', 112, 6.52],
    ['Fiji', 113, 6.54], ['Guyana', 114, 6.64], ['France', 115, 6.67], ['Guinea', 116, 6.84],
    ['Oman', 117, 7.27], ['Belize', 118, 7.65], ['Eritrea', 119, 7.70], ['Cuba', 120, 7.97],
    ['East Timor', 120, 7.97], ['Cambodia', 121, 8.42], ['Greece', 122, 8.55], ['Iraq', 123, 8.65],
    ['Nigeria', 124, 9.12], ['Mauritania', 125, 9.34], ['Italy', 126, 9.37],
    ['South Africa', 127, 9.42], ['Algeria', 128, 9.58], ['Saudi Arabia', 129, 9.64],
    ['DR Congo', 130, 9.65], ['Spain', 131, 9.68], ['Tunisia', 132, 9.87], ['Haiti', 133, 9.99],
    ['Sudan', 134, 10.12], ['Morocco', 135, 10.29], ['South Korea', 136, 10.51],
    ['Vanuatu', 137, 10.64], ['Djibouti', 138, 10.66], ['Angola', 139, 11.02],
    ['Cameroon', 140, 11.17], ['Guatemala', 141, 11.18], ['North Korea', 142, 11.82],
    ['Brazil', 143, 12.15], ['Syria', 144, 12.16], ['New Zealand', 145, 13.05],
    ['Dominican Republic', 146, 13.23], ['Chile', 147, 13.84], ['Kenya', 148, 13.92],
    ['Costa Rica', 149, 14.20], ['Libya', 150, 14.31], ['Malaysia', 151, 14.36],
    ['El Salvador', 152, 14.37], ['Solomon Islands', 153, 14.62], ['Argentina', 154, 15.61],
    ['Honduras', 155, 16.00], ['Turkey', 156, 16.23], ['Tanzania', 157, 16.38],
    ['Japan', 158, 17.03], ['Panama', 159, 18.38], ['Iran', 160, 18.48], ['Canada', 161, 18.99],
    ['Egypt', 162, 20.65], ['Thailand', 163, 20.91], ['Australia', 164, 21.36],
    ['Nicaragua', 165, 22.35], ['Ecuador', 166, 22.42], ['Venezuela', 167, 22.45],
    ['United States', 168, 22.73], ['Madagascar', 169, 23.48], ['Papua New Guinea', 170, 24.10],
    ['Yemen', 171, 24.26], ['Somalia', 172, 25.07], ['Peru', 173, 25.41], ['Vietnam', 174, 25.85],
    ['Russia', 175, 26.54], ['Pakistan', 176, 26.75], ['Bangladesh', 177, 27.90],
    ['China', 178, 28.70], ['Mozambique', 179, 34.37], ['Myanmar', 180, 35.49],
    ['Mexico', 181, 37.55], ['Colombia', 182, 38.37], ['Indonesia', 183, 41.46],
    ['India', 184, 42.31], ['Philippines', 185, 46.82],
  ];
}

async function ensureIndicators() {
  for (const it of INDICATORS) {
    await prisma.indicator.upsert({
      where: { code: it.code },
      create: { code: it.code, name: it.name, topic: it.topic, unit: it.unit, source: 'Bündnis Entwicklung Hilft' },
      update: { name: it.name, topic: it.topic, unit: it.unit, source: 'Bündnis Entwicklung Hilft' },
    });
  }
  console.log(`  ${INDICATORS.length} WRI indicators ensured`);
}

async function main() {
  console.log('\n=== WorldLore: World Risk Index Ingestion ===\n');

  await ensureIndicators();

  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true },
  });
  const iso3ToEntityId: Record<string, string> = {};
  for (const e of entities) iso3ToEntityId[(e.iso3 as string).toUpperCase()] = e.id;
  console.log(`  ${Object.keys(iso3ToEntityId).length} country entities loaded`);

  const data = getWRI2022();
  const year = 2022;

  const upsertRows: Array<{ id: string; entityId: string; indicatorCode: string; year: number; value: number; source: string; meta: unknown }> = [];
  let matched = 0;
  let unmapped: string[] = [];

  for (const [name, rank, score] of data) {
    const iso3 = NAME_TO_ISO3[name];
    if (!iso3) {
      unmapped.push(name);
      continue;
    }
    const entityId = iso3ToEntityId[iso3];
    if (!entityId) continue;
    matched++;

    upsertRows.push(
      { id: randomUUID(), entityId, indicatorCode: 'WRI_SCORE', year, value: score, source: 'Bündnis Entwicklung Hilft', meta: null },
      { id: randomUUID(), entityId, indicatorCode: 'WRI_RANK',  year, value: rank,  source: 'Bündnis Entwicklung Hilft', meta: null },
    );
  }

  console.log(`  Matched ${matched}/${data.length} countries`);
  if (unmapped.length > 0) console.log(`  Unmapped names: ${unmapped.join(', ')}`);

  if (upsertRows.length > 0) {
    await bulkUpsertIndicatorValues(prisma, upsertRows);
    console.log(`  Upserted ${upsertRows.length} WRI values`);
  }

  console.log('\n=== WRI Ingestion Complete ===\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
