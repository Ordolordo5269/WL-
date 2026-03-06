import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertIndicators() {
  const indicators = [
    { code: 'GDP_USD', name: 'GDP (current US$)', topic: 'Economy', unit: 'USD', source: 'World Bank' },
    { code: 'GDP_PC_USD', name: 'GDP per capita (current US$)', topic: 'Economy', unit: 'USD', source: 'World Bank' },
    { code: 'INFLATION_PCT', name: 'Inflation, consumer prices (%)', topic: 'Economy', unit: '%', source: 'World Bank' },
    { code: 'GINI_INDEX', name: 'GINI index', topic: 'Economy', unit: 'index', source: 'World Bank' },
    { code: 'EXPORTS_USD', name: 'Exports of goods and services (US$)', topic: 'Economy', unit: 'USD', source: 'World Bank' },
    { code: 'IMPORTS_USD', name: 'Imports of goods and services (US$)', topic: 'Economy', unit: 'USD', source: 'World Bank' },
    { code: 'TRADE_BALANCE_USD', name: 'Trade balance (US$)', topic: 'Economy', unit: 'USD', source: 'Derived' },
    { code: 'SECTOR_AGR_PCT_GDP', name: 'Agriculture, value added (% of GDP)', topic: 'Economy', unit: '%', source: 'World Bank' },
    { code: 'SECTOR_IND_PCT_GDP', name: 'Industry, value added (% of GDP)', topic: 'Economy', unit: '%', source: 'World Bank' },
    { code: 'SECTOR_SERV_PCT_GDP', name: 'Services, value added (% of GDP)', topic: 'Economy', unit: '%', source: 'World Bank' },

    { code: 'LIFE_EXPECTANCY_YEARS', name: 'Life expectancy at birth, total (years)', topic: 'Society', unit: 'years', source: 'World Bank' },
    { code: 'LITERACY_ADULT_PCT', name: 'Literacy rate, adult total (%)', topic: 'Society', unit: '%', source: 'UNESCO/WB' },
    { code: 'UHC_INDEX', name: 'UHC service coverage index', topic: 'Society', unit: 'index', source: 'WHO' },
    { code: 'POP_TOTAL', name: 'Population, total', topic: 'Society', unit: 'people', source: 'World Bank' },
    { code: 'POP_GROWTH_PCT', name: 'Population growth (annual %)', topic: 'Society', unit: '%', source: 'World Bank' },
    { code: 'URBAN_POP_PCT', name: 'Urban population (% of total)', topic: 'Society', unit: '%', source: 'World Bank' },
    { code: 'RURAL_POP_PCT', name: 'Rural population (% of total)', topic: 'Society', unit: '%', source: 'World Bank' },
    { code: 'CRUDE_BIRTH_PER_1000', name: 'Birth rate, crude (per 1,000 people)', topic: 'Society', unit: 'per_1000', source: 'World Bank' },
    { code: 'CRUDE_DEATH_PER_1000', name: 'Death rate, crude (per 1,000 people)', topic: 'Society', unit: 'per_1000', source: 'World Bank' },
    { code: 'POP_DENSITY_PER_KM2', name: 'Population density (people per sq. km of land area)', topic: 'Society', unit: 'per_km2', source: 'World Bank' },
    { code: 'PRIMARY_NET_ENROLL_PCT', name: 'School enrollment, primary (net, %)', topic: 'Society', unit: '%', source: 'UNESCO' },
    { code: 'POVERTY_215_PCT', name: 'Poverty headcount ratio at $2.15 a day (% of population)', topic: 'Society', unit: '%', source: 'World Bank' },

    { code: 'ODA_NET_USD', name: 'Net official development assistance received (US$)', topic: 'International', unit: 'USD', source: 'OECD/WB' },
    { code: 'TRADE_PCT_GDP', name: 'Trade (% of GDP)', topic: 'International', unit: '%', source: 'World Bank' },
    { code: 'CURRENT_ACCOUNT_USD', name: 'Current account balance (US$)', topic: 'International', unit: 'USD', source: 'IMF/WB' },
    { code: 'FDI_NET_INFLOWS_USD', name: 'Foreign direct investment, net inflows (US$)', topic: 'International', unit: 'USD', source: 'World Bank' },
    { code: 'FDI_NET_OUTFLOWS_USD', name: 'Foreign direct investment, net outflows (US$)', topic: 'International', unit: 'USD', source: 'World Bank' },
    { code: 'REMITTANCES_USD', name: 'Personal remittances, received (US$)', topic: 'International', unit: 'USD', source: 'World Bank' },
  ];

  await prisma.$transaction(
    indicators.map(d => prisma.indicator.upsert({ where: { code: d.code }, create: d, update: d }))
  );
}

async function upsertCoreEntities() {
  // Minimal countries (PER, USA, ESP)
  const countries = [
    { iso2: 'PE', iso3: 'PER', isoNumeric: 604, name: 'Peru', slug: 'peru', type: 'COUNTRY' as const, region: 'Americas', subregion: 'South America' },
    { iso2: 'US', iso3: 'USA', isoNumeric: 840, name: 'United States', slug: 'united-states', type: 'COUNTRY' as const, region: 'Americas', subregion: 'Northern America' },
    { iso2: 'ES', iso3: 'ESP', isoNumeric: 724, name: 'Spain', slug: 'spain', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'FR', iso3: 'FRA', isoNumeric: 250, name: 'France', slug: 'france', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Western Europe' },
    { iso2: 'DE', iso3: 'DEU', isoNumeric: 276, name: 'Germany', slug: 'germany', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Western Europe' },
    { iso2: 'IT', iso3: 'ITA', isoNumeric: 380, name: 'Italy', slug: 'italy', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'PT', iso3: 'PRT', isoNumeric: 620, name: 'Portugal', slug: 'portugal', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'PL', iso3: 'POL', isoNumeric: 616, name: 'Poland', slug: 'poland', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Eastern Europe' },
    { iso2: 'RO', iso3: 'ROU', isoNumeric: 642, name: 'Romania', slug: 'romania', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Eastern Europe' },
    { iso2: 'NL', iso3: 'NLD', isoNumeric: 528, name: 'Netherlands', slug: 'netherlands', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Western Europe' },
    { iso2: 'BE', iso3: 'BEL', isoNumeric: 56, name: 'Belgium', slug: 'belgium', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Western Europe' },
    { iso2: 'LU', iso3: 'LUX', isoNumeric: 442, name: 'Luxembourg', slug: 'luxembourg', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Western Europe' },
    { iso2: 'IE', iso3: 'IRL', isoNumeric: 372, name: 'Ireland', slug: 'ireland', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'DK', iso3: 'DNK', isoNumeric: 208, name: 'Denmark', slug: 'denmark', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'SE', iso3: 'SWE', isoNumeric: 752, name: 'Sweden', slug: 'sweden', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'FI', iso3: 'FIN', isoNumeric: 246, name: 'Finland', slug: 'finland', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'CZ', iso3: 'CZE', isoNumeric: 203, name: 'Czechia', slug: 'czechia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Eastern Europe' },
    { iso2: 'SK', iso3: 'SVK', isoNumeric: 703, name: 'Slovakia', slug: 'slovakia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Eastern Europe' },
    { iso2: 'AT', iso3: 'AUT', isoNumeric: 40, name: 'Austria', slug: 'austria', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Western Europe' },
    { iso2: 'HU', iso3: 'HUN', isoNumeric: 348, name: 'Hungary', slug: 'hungary', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Eastern Europe' },
    { iso2: 'BG', iso3: 'BGR', isoNumeric: 100, name: 'Bulgaria', slug: 'bulgaria', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Eastern Europe' },
    { iso2: 'GR', iso3: 'GRC', isoNumeric: 300, name: 'Greece', slug: 'greece', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'HR', iso3: 'HRV', isoNumeric: 191, name: 'Croatia', slug: 'croatia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'SI', iso3: 'SVN', isoNumeric: 705, name: 'Slovenia', slug: 'slovenia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'EE', iso3: 'EST', isoNumeric: 233, name: 'Estonia', slug: 'estonia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'LV', iso3: 'LVA', isoNumeric: 428, name: 'Latvia', slug: 'latvia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'LT', iso3: 'LTU', isoNumeric: 440, name: 'Lithuania', slug: 'lithuania', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'MT', iso3: 'MLT', isoNumeric: 470, name: 'Malta', slug: 'malta', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'CY', iso3: 'CYP', isoNumeric: 196, name: 'Cyprus', slug: 'cyprus', type: 'COUNTRY' as const, region: 'Asia', subregion: 'Western Asia' },
    { iso2: 'RO', iso3: 'ROU', isoNumeric: 642, name: 'Romania', slug: 'romania', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Eastern Europe' },
    { iso2: 'GB', iso3: 'GBR', isoNumeric: 826, name: 'United Kingdom', slug: 'united-kingdom', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'CA', iso3: 'CAN', isoNumeric: 124, name: 'Canada', slug: 'canada', type: 'COUNTRY' as const, region: 'Americas', subregion: 'Northern America' },
    { iso2: 'TR', iso3: 'TUR', isoNumeric: 792, name: 'Turkey', slug: 'turkey', type: 'COUNTRY' as const, region: 'Asia', subregion: 'Western Asia' },
    { iso2: 'NO', iso3: 'NOR', isoNumeric: 578, name: 'Norway', slug: 'norway', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'IS', iso3: 'ISL', isoNumeric: 352, name: 'Iceland', slug: 'iceland', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'AL', iso3: 'ALB', isoNumeric: 8, name: 'Albania', slug: 'albania', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'MK', iso3: 'MKD', isoNumeric: 807, name: 'North Macedonia', slug: 'north-macedonia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'ME', iso3: 'MNE', isoNumeric: 499, name: 'Montenegro', slug: 'montenegro', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Southern Europe' },
    { iso2: 'LT', iso3: 'LTU', isoNumeric: 440, name: 'Lithuania', slug: 'lithuania', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'LV', iso3: 'LVA', isoNumeric: 428, name: 'Latvia', slug: 'latvia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
    { iso2: 'EE', iso3: 'EST', isoNumeric: 233, name: 'Estonia', slug: 'estonia', type: 'COUNTRY' as const, region: 'Europe', subregion: 'Northern Europe' },
  ];

  for (const c of countries) {
    await prisma.entity.upsert({
      where: { slug: c.slug },
      create: c as any,
      update: c as any,
    });
  }

  // UN Organization
  const un = await prisma.entity.upsert({
    where: { slug: 'un' },
    create: { slug: 'un', name: 'United Nations', type: 'ORGANIZATION', country: 'US' },
    update: { name: 'United Nations' }
  });
  // NATO Organization
  const nato = await prisma.entity.upsert({
    where: { slug: 'nato' },
    create: { slug: 'nato', name: 'North Atlantic Treaty Organization', type: 'ORGANIZATION', country: 'BE' },
    update: { name: 'North Atlantic Treaty Organization' }
  });
  await prisma.organizationSpec.upsert({
    where: { entityId: nato.id },
    create: { entityId: nato.id, orgType: 'Defense alliance', founded: 1949, hqCountry: 'BE', website: 'https://www.nato.int/' },
    update: { orgType: 'Defense alliance' }
  });

  // EU Organization
  const eu = await prisma.entity.upsert({
    where: { slug: 'eu' },
    create: { slug: 'eu', name: 'European Union', type: 'ORGANIZATION', country: 'BE' },
    update: { name: 'European Union' }
  });
  await prisma.organizationSpec.upsert({
    where: { entityId: eu.id },
    create: { entityId: eu.id, orgType: 'Regional union', founded: 1993, hqCountry: 'BE', website: 'https://europa.eu/' },
    update: { orgType: 'Regional union' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: un.id },
    create: { entityId: un.id, orgType: 'IGO', founded: 1945, hqCountry: 'US', website: 'https://un.org' },
    update: { orgType: 'IGO' }
  });

  // Paris Agreement
  const pa = await prisma.entity.upsert({
    where: { slug: 'paris-agreement' },
    create: { slug: 'paris-agreement', name: 'Paris Agreement', type: 'TREATY' },
    update: { name: 'Paris Agreement' },
  });
  await prisma.treatySpec.upsert({
    where: { entityId: pa.id },
    create: { entityId: pa.id, shortName: 'PA', signedDate: new Date('2016-04-22'), entryIntoForce: new Date('2016-11-04'), status: 'in-force', referenceUrl: 'https://unfccc.int/' },
    update: { status: 'in-force' }
  });

  // Memberships and signatures
  const peru = await prisma.entity.findFirstOrThrow({ where: { iso3: 'PER' } });
  await prisma.relation.upsert({
    where: { id: 'rel_per_member_un' },
    create: { id: 'rel_per_member_un', type: 'MEMBER_OF', fromId: peru.id, toId: un.id, startDate: new Date('1945-10-31') },
    update: { startDate: new Date('1945-10-31') }
  });
  await prisma.relation.upsert({
    where: { id: 'rel_per_sign_pa' },
    create: { id: 'rel_per_sign_pa', type: 'SIGNATORY_TO', fromId: peru.id, toId: pa.id, startDate: new Date('2016-04-22') },
    update: { startDate: new Date('2016-04-22') }
  });
  await prisma.relation.upsert({
    where: { id: 'rel_per_rat_pa' },
    create: { id: 'rel_per_rat_pa', type: 'RATIFIED', fromId: peru.id, toId: pa.id, startDate: new Date('2016-07-25') },
    update: { startDate: new Date('2016-07-25') }
  });

  // Seed NATO members (current core list simplified)
  const natoIso3 = ['USA','CAN','GBR','FRA','DEU','ITA','ESP','PRT','NLD','BEL','LUX','DNK','NOR','ISL','GRC','TUR','POL','CZE','SVK','HUN','ROU','BGR','HRV','SVN','LTU','LVA','EST','ALB','MNE','MKD','FIN','SWE'];
  const euIso3 = ['FRA','DEU','ITA','ESP','PRT','NLD','BEL','LUX','IRL','DNK','SWE','FIN','POL','CZE','SVK','HUN','ROU','BGR','HRV','SVN','LTU','LVA','EST','MLT','CYP','AUT','GRC'];

  const natoEntity = await prisma.entity.findFirstOrThrow({ where: { slug: 'nato' } });
  const euEntity = await prisma.entity.findFirstOrThrow({ where: { slug: 'eu' } });

  for (const iso of natoIso3) {
    const c = await prisma.entity.findFirst({ where: { iso3: iso } });
    if (!c) continue;
    await prisma.relation.upsert({
      where: { id: `rel_${iso.toLowerCase()}_member_nato` },
      create: { id: `rel_${iso.toLowerCase()}_member_nato`, type: 'MEMBER_OF', fromId: c.id, toId: natoEntity.id },
      update: { type: 'MEMBER_OF' }
    });
  }
  for (const iso of euIso3) {
    const c = await prisma.entity.findFirst({ where: { iso3: iso } });
    if (!c) continue;
    await prisma.relation.upsert({
      where: { id: `rel_${iso.toLowerCase()}_member_eu` },
      create: { id: `rel_${iso.toLowerCase()}_member_eu`, type: 'MEMBER_OF', fromId: c.id, toId: euEntity.id },
      update: { type: 'MEMBER_OF' }
    });
  }
}

async function upsertSampleIndicatorValues() {
  const peru = await prisma.entity.findFirstOrThrow({ where: { iso3: 'PER' } });
  await prisma.indicatorValue.upsert({
    where: { entityId_indicatorCode_year: { entityId: peru.id, indicatorCode: 'GDP_USD', year: 2023 } },
    update: { value: new Prisma.Decimal(278000000000), source: 'World Bank' },
    create: { entityId: peru.id, indicatorCode: 'GDP_USD', year: 2023, value: new Prisma.Decimal(278000000000), source: 'World Bank' },
  });
}

/**
 * Seeds UN organizations with their member states
 * Based on official data as of 2024-2025
 */
async function seedUNOrganizations() {
  // All 193 UN Member States (ISO3 codes)
  // Vatican City (VAT) is not a UN member state
  const unMemberStates = [
    'AFG', 'ALB', 'DZA', 'AND', 'AGO', 'ATG', 'ARG', 'ARM', 'AUS', 'AUT',
    'AZE', 'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BEL', 'BLZ', 'BEN', 'BTN',
    'BOL', 'BIH', 'BWA', 'BRA', 'BRN', 'BGR', 'BFA', 'BDI', 'CPV', 'KHM',
    'CMR', 'CAN', 'CAF', 'TCD', 'CHL', 'CHN', 'COL', 'COM', 'COG', 'CRI',
    'CIV', 'HRV', 'CUB', 'CYP', 'CZE', 'PRK', 'COD', 'DNK', 'DJI', 'DMA',
    'DOM', 'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'EST', 'SWZ', 'ETH', 'FJI',
    'FIN', 'FRA', 'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GRC', 'GRD', 'GTM',
    'GIN', 'GNB', 'GUY', 'HTI', 'HND', 'HUN', 'ISL', 'IND', 'IDN', 'IRN',
    'IRQ', 'IRL', 'ISR', 'ITA', 'JAM', 'JPN', 'JOR', 'KAZ', 'KEN', 'KIR',
    'KWT', 'KGZ', 'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LIE', 'LTU',
    'LUX', 'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MLT', 'MHL', 'MRT', 'MUS',
    'MEX', 'FSM', 'MDA', 'MCO', 'MNG', 'MNE', 'MAR', 'MOZ', 'MMR', 'NAM',
    'NRU', 'NPL', 'NLD', 'NZL', 'NIC', 'NER', 'NGA', 'MKD', 'NOR', 'OMN',
    'PAK', 'PLW', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'POL', 'PRT', 'QAT',
    'KOR', 'ROU', 'RUS', 'RWA', 'KNA', 'LCA', 'VCT', 'WSM', 'SMR', 'STP',
    'SAU', 'SEN', 'SRB', 'SYC', 'SLE', 'SGP', 'SVK', 'SVN', 'SLB', 'SOM',
    'ZAF', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SWE', 'CHE', 'SYR', 'TJK',
    'TZA', 'THA', 'TLS', 'TGO', 'TON', 'TTO', 'TUN', 'TUR', 'TKM', 'TUV',
    'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'URY', 'UZB', 'VUT', 'VEN', 'VNM',
    'YEM', 'ZMB', 'ZWE'
  ];

  // WHO: All UN members except Liechtenstein, plus Cook Islands and Niue
  const whoMemberStates = [...unMemberStates.filter(iso => iso !== 'LIE'), 'COK', 'NIU'];

  // UNESCO: All UN members except Israel and Liechtenstein, plus Cook Islands, Niue, and Palestine
  const unescoMemberStates = [...unMemberStates.filter(iso => iso !== 'ISR' && iso !== 'LIE'), 'COK', 'NIU', 'PSE'];

  // UNICEF and WFP: All UN member states (they operate in all UN member countries)
  const unicefMemberStates = unMemberStates;
  const wfpMemberStates = unMemberStates;

  // Create/update organization entities
  const who = await prisma.entity.upsert({
    where: { slug: 'who' },
    create: { slug: 'who', name: 'World Health Organization', type: 'ORGANIZATION', country: 'CH' },
    update: { name: 'World Health Organization' }
  });

  const unesco = await prisma.entity.upsert({
    where: { slug: 'unesco' },
    create: { slug: 'unesco', name: 'United Nations Educational, Scientific and Cultural Organization', type: 'ORGANIZATION', country: 'FR' },
    update: { name: 'United Nations Educational, Scientific and Cultural Organization' }
  });

  const unicef = await prisma.entity.upsert({
    where: { slug: 'unicef' },
    create: { slug: 'unicef', name: 'United Nations Children\'s Fund', type: 'ORGANIZATION', country: 'US' },
    update: { name: 'United Nations Children\'s Fund' }
  });

  const wfp = await prisma.entity.upsert({
    where: { slug: 'wfp' },
    create: { slug: 'wfp', name: 'World Food Programme', type: 'ORGANIZATION', country: 'IT' },
    update: { name: 'World Food Programme' }
  });

  // Update organization specs
  await prisma.organizationSpec.upsert({
    where: { entityId: who.id },
    create: { entityId: who.id, orgType: 'UN Specialized Agency', founded: 1948, hqCountry: 'CH', website: 'https://www.who.int/' },
    update: { orgType: 'UN Specialized Agency' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: unesco.id },
    create: { entityId: unesco.id, orgType: 'UN Specialized Agency', founded: 1945, hqCountry: 'FR', website: 'https://www.unesco.org/' },
    update: { orgType: 'UN Specialized Agency' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: unicef.id },
    create: { entityId: unicef.id, orgType: 'UN Fund', founded: 1946, hqCountry: 'US', website: 'https://www.unicef.org/' },
    update: { orgType: 'UN Fund' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: wfp.id },
    create: { entityId: wfp.id, orgType: 'UN Programme', founded: 1961, hqCountry: 'IT', website: 'https://www.wfp.org/' },
    update: { orgType: 'UN Programme' }
  });

  // Get UN organization
  const un = await prisma.entity.findFirstOrThrow({ where: { slug: 'un' } });

  // Helper function to create membership relations
  async function createMemberships(orgSlug: string, orgId: string, memberIso3List: string[]) {
    let count = 0;
    let skipped = 0;

    for (const iso3 of memberIso3List) {
      const country = await prisma.entity.findFirst({ where: { iso3: iso3 } });
      if (!country) {
        skipped++;
        continue;
      }

      const relId = `rel_${iso3.toLowerCase()}_member_${orgSlug}`;
      await prisma.relation.upsert({
        where: { id: relId },
        create: {
          id: relId,
          type: 'MEMBER_OF',
          fromId: country.id,
          toId: orgId
        },
        update: {
          type: 'MEMBER_OF'
        }
      });
      count++;
    }

    console.log(`✓ ${orgSlug.toUpperCase()}: Created ${count} memberships (${skipped} countries not found in database)`);
    return { count, skipped };
  }

  // Seed UN memberships (all existing countries that are UN members)
  await createMemberships('un', un.id, unMemberStates);

  // Seed WHO memberships
  await createMemberships('who', who.id, whoMemberStates);

  // Seed UNESCO memberships
  await createMemberships('unesco', unesco.id, unescoMemberStates);

  // Seed UNICEF memberships
  await createMemberships('unicef', unicef.id, unicefMemberStates);

  // Seed WFP memberships
  await createMemberships('wfp', wfp.id, wfpMemberStates);

  console.log('\n✅ UN Organizations seeding completed!');
}

/**
 * Seeds regional organizations with their member states
 * Based on official data as of 2024-2025
 */
async function seedRegionalOrganizations() {
  // ASEAN: 10 member states
  const aseanMemberStates = ['BRN', 'KHM', 'IDN', 'LAO', 'MYS', 'MMR', 'PHL', 'SGP', 'THA', 'VNM'];

  // OAS: 35 member states (all American countries)
  const oasMemberStates = [
    'ATG', 'ARG', 'BHS', 'BRB', 'BLZ', 'BOL', 'BRA', 'CAN', 'CHL', 'COL',
    'CRI', 'CUB', 'DMA', 'DOM', 'ECU', 'SLV', 'GRD', 'GTM', 'GUY', 'HTI',
    'HND', 'JAM', 'MEX', 'NIC', 'PAN', 'PRY', 'PER', 'KNA', 'LCA', 'VCT',
    'SUR', 'TTO', 'USA', 'URY', 'VEN'
  ];

  // ECOWAS: 15 member states (West African countries)
  const ecowasMemberStates = [
    'BEN', 'BFA', 'CPV', 'CIV', 'GMB', 'GHA', 'GIN', 'GNB', 'LBR', 'MLI',
    'NER', 'NGA', 'SEN', 'SLE', 'TGO'
  ];

  // SADC: 16 member states (Southern African countries)
  const sadcMemberStates = [
    'AGO', 'BWA', 'COM', 'COD', 'SWZ', 'LSO', 'MDG', 'MWI', 'MUS', 'MOZ',
    'NAM', 'SYC', 'ZAF', 'TZA', 'ZMB', 'ZWE'
  ];

  // SCO: Shanghai Cooperation Organization - 10 full members (as of 2024)
  const scoMemberStates = ['CHN', 'IND', 'KAZ', 'KGZ', 'PAK', 'RUS', 'TJK', 'UZB', 'IRN', 'BLR']; // IRN joined 2023, BLR joined 2024

  // CSTO: Collective Security Treaty Organization - 6 member states (Armenia suspended participation in 2024)
  const cstoMemberStates = ['ARM', 'BLR', 'KAZ', 'KGZ', 'RUS', 'TJK']; // ARM suspended but included

  // African Union: All African countries (55 members)
  // Note: Western Sahara (Sahrawi Arab Democratic Republic) is recognized by AU but may not have ISO code in DB
  const auMemberStates = [
    'DZA', 'AGO', 'BEN', 'BWA', 'BFA', 'BDI', 'CPV', 'CMR', 'CAF', 'TCD',
    'COM', 'COG', 'CIV', 'COD', 'DJI', 'EGY', 'GNQ', 'ERI', 'SWZ', 'ETH',
    'GAB', 'GMB', 'GHA', 'GIN', 'GNB', 'KEN', 'LSO', 'LBR', 'LBY', 'MDG',
    'MWI', 'MLI', 'MRT', 'MUS', 'MAR', 'MOZ', 'NAM', 'NER', 'NGA', 'RWA',
    'STP', 'SEN', 'SYC', 'SLE', 'SOM', 'ZAF', 'SSD', 'SDN', 'TZA', 'TGO',
    'TUN', 'UGA', 'ZMB', 'ZWE'
  ];

  // Create/update organization entities
  const asean = await prisma.entity.upsert({
    where: { slug: 'asean' },
    create: { slug: 'asean', name: 'Association of Southeast Asian Nations', type: 'ORGANIZATION', country: 'ID' },
    update: { name: 'Association of Southeast Asian Nations' }
  });

  const au = await prisma.entity.upsert({
    where: { slug: 'au' },
    create: { slug: 'au', name: 'African Union', type: 'ORGANIZATION', country: 'ET' },
    update: { name: 'African Union' }
  });

  const oas = await prisma.entity.upsert({
    where: { slug: 'oas' },
    create: { slug: 'oas', name: 'Organization of American States', type: 'ORGANIZATION', country: 'US' },
    update: { name: 'Organization of American States' }
  });

  const ecowas = await prisma.entity.upsert({
    where: { slug: 'ecowas' },
    create: { slug: 'ecowas', name: 'Economic Community of West African States', type: 'ORGANIZATION', country: 'NG' },
    update: { name: 'Economic Community of West African States' }
  });

  const sadc = await prisma.entity.upsert({
    where: { slug: 'sadc' },
    create: { slug: 'sadc', name: 'Southern African Development Community', type: 'ORGANIZATION', country: 'BW' },
    update: { name: 'Southern African Development Community' }
  });

  const sco = await prisma.entity.upsert({
    where: { slug: 'sco' },
    create: { slug: 'sco', name: 'Shanghai Cooperation Organization', type: 'ORGANIZATION', country: 'CN' },
    update: { name: 'Shanghai Cooperation Organization' }
  });

  const csto = await prisma.entity.upsert({
    where: { slug: 'csto' },
    create: { slug: 'csto', name: 'Collective Security Treaty Organization', type: 'ORGANIZATION', country: 'RU' },
    update: { name: 'Collective Security Treaty Organization' }
  });

  // Update organization specs
  await prisma.organizationSpec.upsert({
    where: { entityId: asean.id },
    create: { entityId: asean.id, orgType: 'Regional organization', founded: 1967, hqCountry: 'ID', website: 'https://asean.org/' },
    update: { orgType: 'Regional organization' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: au.id },
    create: { entityId: au.id, orgType: 'Regional union', founded: 2002, hqCountry: 'ET', website: 'https://au.int/' },
    update: { orgType: 'Regional union' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: oas.id },
    create: { entityId: oas.id, orgType: 'Regional organization', founded: 1948, hqCountry: 'US', website: 'https://www.oas.org/' },
    update: { orgType: 'Regional organization' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: ecowas.id },
    create: { entityId: ecowas.id, orgType: 'Regional economic union', founded: 1975, hqCountry: 'NG', website: 'https://www.ecowas.int/' },
    update: { orgType: 'Regional economic union' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: sadc.id },
    create: { entityId: sadc.id, orgType: 'Regional economic community', founded: 1992, hqCountry: 'BW', website: 'https://www.sadc.int/' },
    update: { orgType: 'Regional economic community' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: sco.id },
    create: { entityId: sco.id, orgType: 'Regional security organization', founded: 2001, hqCountry: 'CN', website: 'http://eng.sectsco.org/' },
    update: { orgType: 'Regional security organization' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: csto.id },
    create: { entityId: csto.id, orgType: 'Military alliance', founded: 1994, hqCountry: 'RU', website: 'https://en.odkb-csto.org/' },
    update: { orgType: 'Military alliance' }
  });

  // Helper function to create membership relations (reuse from seedUNOrganizations)
  async function createMemberships(orgSlug: string, orgId: string, memberIso3List: string[]) {
    let count = 0;
    let skipped = 0;

    for (const iso3 of memberIso3List) {
      const country = await prisma.entity.findFirst({ where: { iso3: iso3 } });
      if (!country) {
        skipped++;
        continue;
      }

      const relId = `rel_${iso3.toLowerCase()}_member_${orgSlug}`;
      await prisma.relation.upsert({
        where: { id: relId },
        create: {
          id: relId,
          type: 'MEMBER_OF',
          fromId: country.id,
          toId: orgId
        },
        update: {
          type: 'MEMBER_OF'
        }
      });
      count++;
    }

    console.log(`✓ ${orgSlug.toUpperCase()}: Created ${count} memberships (${skipped} countries not found in database)`);
    return { count, skipped };
  }

  // Seed memberships for each organization
  await createMemberships('asean', asean.id, aseanMemberStates);
  await createMemberships('au', au.id, auMemberStates);
  await createMemberships('oas', oas.id, oasMemberStates);
  await createMemberships('ecowas', ecowas.id, ecowasMemberStates);
  await createMemberships('sadc', sadc.id, sadcMemberStates);
  await createMemberships('sco', sco.id, scoMemberStates);
  await createMemberships('csto', csto.id, cstoMemberStates);

  console.log('\n✅ Regional Organizations seeding completed!');
}

/**
 * Seeds trade organizations with their member states
 * Based on official data as of 2024-2025
 */
async function seedTradeOrganizations() {
  // WTO: 164-166 members (includes most UN member states, EU, Hong Kong, Macao, Taiwan)
  // Using all UN member states as base (WTO includes nearly all UN members)
  // Note: WTO also includes EU as a member, Hong Kong (HKG), Macao (MAC), Taiwan (TWN)
  // For simplicity, we'll use UN member states list as WTO is almost universal
  const wtoMemberStates = [
    'AFG', 'ALB', 'DZA', 'AND', 'AGO', 'ATG', 'ARG', 'ARM', 'AUS', 'AUT',
    'AZE', 'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BEL', 'BLZ', 'BEN', 'BTN',
    'BOL', 'BIH', 'BWA', 'BRA', 'BRN', 'BGR', 'BFA', 'BDI', 'CPV', 'KHM',
    'CMR', 'CAN', 'CAF', 'TCD', 'CHL', 'CHN', 'COL', 'COM', 'COG', 'CRI',
    'CIV', 'HRV', 'CUB', 'CYP', 'CZE', 'PRK', 'COD', 'DNK', 'DJI', 'DMA',
    'DOM', 'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'EST', 'SWZ', 'ETH', 'FJI',
    'FIN', 'FRA', 'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GRC', 'GRD', 'GTM',
    'GIN', 'GNB', 'GUY', 'HTI', 'HND', 'HUN', 'ISL', 'IND', 'IDN', 'IRN',
    'IRQ', 'IRL', 'ISR', 'ITA', 'JAM', 'JPN', 'JOR', 'KAZ', 'KEN', 'KIR',
    'KWT', 'KGZ', 'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LIE', 'LTU',
    'LUX', 'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MLT', 'MHL', 'MRT', 'MUS',
    'MEX', 'FSM', 'MDA', 'MCO', 'MNG', 'MNE', 'MAR', 'MOZ', 'MMR', 'NAM',
    'NRU', 'NPL', 'NLD', 'NZL', 'NIC', 'NER', 'NGA', 'MKD', 'NOR', 'OMN',
    'PAK', 'PLW', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'POL', 'PRT', 'QAT',
    'KOR', 'ROU', 'RUS', 'RWA', 'KNA', 'LCA', 'VCT', 'WSM', 'SMR', 'STP',
    'SAU', 'SEN', 'SRB', 'SYC', 'SLE', 'SGP', 'SVK', 'SVN', 'SLB', 'SOM',
    'ZAF', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SWE', 'CHE', 'SYR', 'TJK',
    'TZA', 'THA', 'TLS', 'TGO', 'TON', 'TTO', 'TUN', 'TUR', 'TKM', 'TUV',
    'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'URY', 'UZB', 'VUT', 'VEN', 'VNM',
    'YEM', 'ZMB', 'ZWE'
  ];

  // EFTA: 4 member states
  const eftaMemberStates = ['ISL', 'LIE', 'NOR', 'CHE'];

  // USMCA: 3 member states
  const usmcaMemberStates = ['USA', 'MEX', 'CAN'];

  // MERCOSUR: 5 full members (Bolivia joined as full member in 2024, Venezuela is suspended)
  const mercosurMemberStates = ['ARG', 'BOL', 'BRA', 'PRY', 'URY', 'VEN']; // VEN suspended but included

  // Create/update organization entities
  const wto = await prisma.entity.upsert({
    where: { slug: 'wto' },
    create: { slug: 'wto', name: 'World Trade Organization', type: 'ORGANIZATION', country: 'CH' },
    update: { name: 'World Trade Organization' }
  });

  const efta = await prisma.entity.upsert({
    where: { slug: 'efta' },
    create: { slug: 'efta', name: 'European Free Trade Association', type: 'ORGANIZATION', country: 'CH' },
    update: { name: 'European Free Trade Association' }
  });

  const usmca = await prisma.entity.upsert({
    where: { slug: 'usmca' },
    create: { slug: 'usmca', name: 'United States–Mexico–Canada Agreement', type: 'ORGANIZATION', country: 'US' },
    update: { name: 'United States–Mexico–Canada Agreement' }
  });

  const mercosur = await prisma.entity.upsert({
    where: { slug: 'mercosur' },
    create: { slug: 'mercosur', name: 'Mercado Común del Sur', type: 'ORGANIZATION', country: 'UY' },
    update: { name: 'Mercado Común del Sur' }
  });

  // Update organization specs
  await prisma.organizationSpec.upsert({
    where: { entityId: wto.id },
    create: { entityId: wto.id, orgType: 'Intergovernmental organization', founded: 1995, hqCountry: 'CH', website: 'https://www.wto.org/' },
    update: { orgType: 'Intergovernmental organization' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: efta.id },
    create: { entityId: efta.id, orgType: 'Regional trade organization', founded: 1960, hqCountry: 'CH', website: 'https://www.efta.int/' },
    update: { orgType: 'Regional trade organization' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: usmca.id },
    create: { entityId: usmca.id, orgType: 'Trade agreement', founded: 2020, hqCountry: 'US', website: 'https://www.international.gc.ca/trade-commerce/trade-agreements-accords-commerciaux/agr-acc/cusma-aceum/index.aspx' },
    update: { orgType: 'Trade agreement' }
  });

  await prisma.organizationSpec.upsert({
    where: { entityId: mercosur.id },
    create: { entityId: mercosur.id, orgType: 'Trade bloc', founded: 1991, hqCountry: 'UY', website: 'https://www.mercosur.int/' },
    update: { orgType: 'Trade bloc' }
  });

  // Helper function to create membership relations
  async function createMemberships(orgSlug: string, orgId: string, memberIso3List: string[]) {
    let count = 0;
    let skipped = 0;

    for (const iso3 of memberIso3List) {
      const country = await prisma.entity.findFirst({ where: { iso3: iso3 } });
      if (!country) {
        skipped++;
        continue;
      }

      const relId = `rel_${iso3.toLowerCase()}_member_${orgSlug}`;
      await prisma.relation.upsert({
        where: { id: relId },
        create: {
          id: relId,
          type: 'MEMBER_OF',
          fromId: country.id,
          toId: orgId
        },
        update: {
          type: 'MEMBER_OF'
        }
      });
      count++;
    }

    console.log(`✓ ${orgSlug.toUpperCase()}: Created ${count} memberships (${skipped} countries not found in database)`);
    return { count, skipped };
  }

  // Seed memberships for each organization
  await createMemberships('wto', wto.id, wtoMemberStates);
  await createMemberships('efta', efta.id, eftaMemberStates);
  await createMemberships('usmca', usmca.id, usmcaMemberStates);
  await createMemberships('mercosur', mercosur.id, mercosurMemberStates);

  console.log('\n✅ Trade Organizations seeding completed!');
}

async function main() {
  await upsertIndicators();
  await upsertCoreEntities();
  await upsertSampleIndicatorValues();
  await seedUNOrganizations();
  await seedRegionalOrganizations();
  await seedTradeOrganizations();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });




