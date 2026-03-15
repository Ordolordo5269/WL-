/**
 * Enrich Entity.props with languages, currencies, and government type
 * from REST Countries API v3.1. Quick one-time script.
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REST_COUNTRIES_URL = 'https://restcountries.com/v3.1/all?fields=cca3,languages,currencies,demonyms,government';

// Government type mapping by ISO3 (curated from CIA World Factbook + official sources)
const GOVERNMENT_TYPES: Record<string, string> = {
  USA: 'Federal presidential constitutional republic',
  GBR: 'Parliamentary constitutional monarchy',
  FRA: 'Unitary semi-presidential republic',
  DEU: 'Federal parliamentary republic',
  JPN: 'Parliamentary constitutional monarchy',
  CHN: 'Unitary one-party socialist republic',
  IND: 'Federal parliamentary republic',
  BRA: 'Federal presidential constitutional republic',
  RUS: 'Federal semi-presidential republic',
  CAN: 'Federal parliamentary constitutional monarchy',
  AUS: 'Federal parliamentary constitutional monarchy',
  ITA: 'Unitary parliamentary republic',
  KOR: 'Unitary presidential constitutional republic',
  ESP: 'Parliamentary constitutional monarchy',
  MEX: 'Federal presidential constitutional republic',
  IDN: 'Unitary presidential constitutional republic',
  NLD: 'Parliamentary constitutional monarchy',
  SAU: 'Absolute monarchy',
  TUR: 'Unitary presidential constitutional republic',
  CHE: 'Federal semi-direct democracy',
  POL: 'Unitary semi-presidential republic',
  BEL: 'Federal parliamentary constitutional monarchy',
  ARG: 'Federal presidential constitutional republic',
  SWE: 'Parliamentary constitutional monarchy',
  THA: 'Parliamentary constitutional monarchy',
  IRN: 'Unitary Islamic republic',
  EGY: 'Unitary semi-presidential republic',
  PAK: 'Federal parliamentary republic',
  BGD: 'Unitary parliamentary republic',
  VNM: 'Unitary one-party socialist republic',
  PHL: 'Unitary presidential constitutional republic',
  ZAF: 'Unitary parliamentary republic',
  NGA: 'Federal presidential republic',
  KEN: 'Unitary presidential republic',
  COL: 'Unitary presidential constitutional republic',
  CHL: 'Unitary presidential constitutional republic',
  PER: 'Unitary presidential constitutional republic',
  ROU: 'Unitary semi-presidential republic',
  CZE: 'Unitary parliamentary republic',
  HUN: 'Unitary parliamentary republic',
  GRC: 'Unitary parliamentary republic',
  PRT: 'Unitary semi-presidential republic',
  DNK: 'Parliamentary constitutional monarchy',
  FIN: 'Unitary parliamentary republic',
  NOR: 'Parliamentary constitutional monarchy',
  IRL: 'Unitary parliamentary republic',
  NZL: 'Parliamentary constitutional monarchy',
  SGP: 'Unitary parliamentary republic',
  MYS: 'Federal parliamentary constitutional monarchy',
  ARE: 'Federal absolute monarchy',
  QAT: 'Absolute monarchy',
  ISR: 'Unitary parliamentary republic',
  UKR: 'Unitary semi-presidential republic',
  KAZ: 'Unitary presidential republic',
  UZB: 'Unitary presidential republic',
  AUT: 'Federal parliamentary republic',
  ISL: 'Unitary parliamentary republic',
  LUX: 'Parliamentary constitutional monarchy',
  CRI: 'Unitary presidential constitutional republic',
  URY: 'Unitary presidential constitutional republic',
  CUB: 'Unitary one-party socialist republic',
  PRK: 'Unitary one-party socialist republic',
  SYR: 'Unitary semi-presidential republic',
  IRQ: 'Federal parliamentary republic',
  AFG: 'Unitary theocratic emirate',
  ETH: 'Federal parliamentary republic',
  TZA: 'Unitary presidential republic',
  GHA: 'Unitary presidential constitutional republic',
  SEN: 'Unitary presidential republic',
  CMR: 'Unitary presidential republic',
  CIV: 'Unitary presidential republic',
  MDG: 'Unitary semi-presidential republic',
  MOZ: 'Unitary presidential republic',
  AGO: 'Unitary presidential republic',
  ZWE: 'Unitary presidential republic',
  SDN: 'Transitional military government',
  SSD: 'Federal presidential republic',
  LBY: 'Transitional government',
  TUN: 'Unitary presidential republic',
  MAR: 'Parliamentary constitutional monarchy',
  DZA: 'Unitary semi-presidential republic',
  JOR: 'Parliamentary constitutional monarchy',
  LBN: 'Unitary parliamentary republic',
  OMN: 'Absolute monarchy',
  KWT: 'Constitutional monarchy',
  BHR: 'Constitutional monarchy',
  MMR: 'Military junta',
  LAO: 'Unitary one-party socialist republic',
  KHM: 'Parliamentary constitutional monarchy',
  NPL: 'Federal parliamentary republic',
  LKA: 'Unitary semi-presidential republic',
  SRB: 'Unitary parliamentary republic',
  HRV: 'Unitary parliamentary republic',
  SVN: 'Unitary parliamentary republic',
  SVK: 'Unitary parliamentary republic',
  BGR: 'Unitary parliamentary republic',
  BIH: 'Federal parliamentary republic',
  MKD: 'Unitary parliamentary republic',
  MNE: 'Unitary parliamentary republic',
  ALB: 'Unitary parliamentary republic',
  GEO: 'Unitary parliamentary republic',
  ARM: 'Unitary parliamentary republic',
  AZE: 'Unitary presidential republic',
  MDA: 'Unitary parliamentary republic',
  BLR: 'Unitary presidential republic',
  LTU: 'Unitary semi-presidential republic',
  LVA: 'Unitary parliamentary republic',
  EST: 'Unitary parliamentary republic',
  TWN: 'Unitary semi-presidential republic',
  HKG: 'Special administrative region',
  MAC: 'Special administrative region',
  MNG: 'Unitary semi-presidential republic',
  TKM: 'Unitary presidential republic',
  TJK: 'Unitary presidential republic',
  KGZ: 'Unitary presidential republic',
  DOM: 'Unitary presidential republic',
  HTI: 'Unitary semi-presidential republic',
  JAM: 'Parliamentary constitutional monarchy',
  TTO: 'Unitary parliamentary republic',
  PAN: 'Unitary presidential republic',
  GTM: 'Unitary presidential republic',
  HND: 'Unitary presidential republic',
  SLV: 'Unitary presidential republic',
  NIC: 'Unitary presidential republic',
  ECU: 'Unitary presidential republic',
  BOL: 'Unitary presidential republic',
  PRY: 'Unitary presidential republic',
  VEN: 'Federal presidential republic',
  GUY: 'Unitary semi-presidential republic',
  SUR: 'Unitary presidential republic',
};

async function main() {
  console.log('\n=== Enriching Country Metadata (Languages, Currencies, Government) ===\n');

  // 1. Fetch all countries from REST Countries API
  console.log('Fetching from REST Countries API...');
  const { data: rcCountries } = await axios.get(REST_COUNTRIES_URL, { timeout: 20000 });
  console.log(`  Got ${rcCountries.length} countries\n`);

  // Build lookup: iso3 → { languages, currencies }
  const rcByIso3: Record<string, { languages?: any; currencies?: any }> = {};
  for (const c of rcCountries) {
    if (c.cca3 && c.cca3.length === 3) {
      rcByIso3[c.cca3.toUpperCase()] = {
        languages: c.languages || undefined,
        currencies: c.currencies || undefined,
      };
    }
  }

  // 2. Update all country entities
  const entities = await prisma.entity.findMany({
    where: { type: 'COUNTRY', iso3: { not: null } },
    select: { id: true, iso3: true, name: true, props: true }
  });

  let updated = 0;
  for (const e of entities) {
    const iso3 = (e.iso3 as string).toUpperCase();
    const rc = rcByIso3[iso3];
    const currentProps = (e.props as any) || {};

    const newProps = { ...currentProps };
    let changed = false;

    if (rc?.languages && !currentProps.languages) {
      newProps.languages = rc.languages;
      changed = true;
    }
    if (rc?.currencies && !currentProps.currencies) {
      newProps.currencies = rc.currencies;
      changed = true;
    }
    if (GOVERNMENT_TYPES[iso3] && !currentProps.governmentType) {
      newProps.governmentType = GOVERNMENT_TYPES[iso3];
      changed = true;
    }

    if (changed) {
      await prisma.entity.update({
        where: { id: e.id },
        data: { props: newProps as any }
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} countries with languages/currencies/government\n`);

  // Quick verification
  const austria = await prisma.entity.findFirst({ where: { type: 'COUNTRY', iso3: 'AUT' }, select: { props: true } });
  const p = austria?.props as any;
  console.log('Verification (Austria):');
  console.log('  Languages:', JSON.stringify(p?.languages));
  console.log('  Currencies:', JSON.stringify(p?.currencies));
  console.log('  Government:', p?.governmentType);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
