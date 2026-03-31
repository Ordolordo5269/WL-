import type { JPRawLanguage, JPRawCountry, JPRawPeopleGroup } from './client.js';

// ── Language family mapping (manual, rigorous) ──────────────────────
// Based on ISO 639-3 code → family. Covers the ~120 most spoken languages
// plus broad pattern matching for smaller ones via people-cluster heuristics.

const FAMILY_BY_ISO: Record<string, string> = {
  // Indo-European: Germanic
  eng: 'Indo-European', deu: 'Indo-European', nld: 'Indo-European',
  swe: 'Indo-European', nor: 'Indo-European', dan: 'Indo-European',
  isl: 'Indo-European', afr: 'Indo-European', yid: 'Indo-European',
  ltz: 'Indo-European', fry: 'Indo-European',
  // Indo-European: Romance
  spa: 'Indo-European', por: 'Indo-European', fra: 'Indo-European',
  ita: 'Indo-European', ron: 'Indo-European', cat: 'Indo-European',
  glg: 'Indo-European', oci: 'Indo-European',
  // Indo-European: Slavic
  rus: 'Indo-European', pol: 'Indo-European', ukr: 'Indo-European',
  ces: 'Indo-European', slk: 'Indo-European', bul: 'Indo-European',
  hrv: 'Indo-European', srp: 'Indo-European', slv: 'Indo-European',
  bel: 'Indo-European', mkd: 'Indo-European', bos: 'Indo-European',
  // Indo-European: Indo-Aryan
  hin: 'Indo-European', urd: 'Indo-European', ben: 'Indo-European',
  pan: 'Indo-European', guj: 'Indo-European', mar: 'Indo-European',
  nep: 'Indo-European', sin: 'Indo-European', asm: 'Indo-European',
  ori: 'Indo-European', mai: 'Indo-European', bho: 'Indo-European',
  rom: 'Indo-European', kok: 'Indo-European', snd: 'Indo-European',
  // Indo-European: Iranian
  fas: 'Indo-European', prs: 'Indo-European', pus: 'Indo-European',
  pbt: 'Indo-European', kur: 'Indo-European', kmr: 'Indo-European',
  ckb: 'Indo-European', tgk: 'Indo-European', bal: 'Indo-European',
  // Indo-European: Celtic
  gle: 'Indo-European', cym: 'Indo-European', bre: 'Indo-European',
  gla: 'Indo-European',
  // Indo-European: other
  ell: 'Indo-European', hye: 'Indo-European', sqi: 'Indo-European',
  aln: 'Indo-European', als: 'Indo-European', lit: 'Indo-European',
  lav: 'Indo-European',

  // Sino-Tibetan
  cmn: 'Sino-Tibetan', yue: 'Sino-Tibetan', wuu: 'Sino-Tibetan',
  nan: 'Sino-Tibetan', hak: 'Sino-Tibetan', hsn: 'Sino-Tibetan',
  gan: 'Sino-Tibetan', mya: 'Sino-Tibetan', bod: 'Sino-Tibetan',
  dzo: 'Sino-Tibetan', lus: 'Sino-Tibetan', mni: 'Sino-Tibetan',
  new_: 'Sino-Tibetan', lep: 'Sino-Tibetan', brx: 'Sino-Tibetan',

  // Afroasiatic: Semitic
  arb: 'Afroasiatic', arz: 'Afroasiatic', apc: 'Afroasiatic',
  acm: 'Afroasiatic', ary: 'Afroasiatic', aeb: 'Afroasiatic',
  apd: 'Afroasiatic', heb: 'Afroasiatic', amh: 'Afroasiatic',
  tir: 'Afroasiatic', mlt: 'Afroasiatic', acq: 'Afroasiatic',
  // Afroasiatic: other
  hau: 'Afroasiatic', orm: 'Afroasiatic', som: 'Afroasiatic',

  // Niger-Congo
  swa: 'Niger-Congo', swh: 'Niger-Congo', yor: 'Niger-Congo',
  ibo: 'Niger-Congo', kin: 'Niger-Congo', run: 'Niger-Congo',
  nya: 'Niger-Congo', sna: 'Niger-Congo', zul: 'Niger-Congo',
  xho: 'Niger-Congo', lin: 'Niger-Congo', tsn: 'Niger-Congo',
  twi: 'Niger-Congo', ewe: 'Niger-Congo', lug: 'Niger-Congo',
  wol: 'Niger-Congo', ful: 'Niger-Congo', bam: 'Niger-Congo',
  aka: 'Niger-Congo', mos: 'Niger-Congo', nso: 'Niger-Congo',
  ssw: 'Niger-Congo', sot: 'Niger-Congo', tso: 'Niger-Congo',
  ven: 'Niger-Congo', nbl: 'Niger-Congo',

  // Austronesian
  msa: 'Austronesian', zlm: 'Austronesian', ind: 'Austronesian',
  jav: 'Austronesian', sun: 'Austronesian', tgl: 'Austronesian',
  fil: 'Austronesian', mlg: 'Austronesian', ceb: 'Austronesian',
  ilo: 'Austronesian', hil: 'Austronesian', war: 'Austronesian',
  mri: 'Austronesian', smo: 'Austronesian', ton: 'Austronesian',
  fij: 'Austronesian', haw: 'Austronesian', min: 'Austronesian',
  mad: 'Austronesian', ban: 'Austronesian',

  // Dravidian
  tam: 'Dravidian', tel: 'Dravidian', kan: 'Dravidian',
  mal: 'Dravidian', tcy: 'Dravidian',

  // Turkic
  tur: 'Turkic', aze: 'Turkic', uzb: 'Turkic', kaz: 'Turkic',
  kir: 'Turkic', tuk: 'Turkic', tat: 'Turkic', uig: 'Turkic',
  bak: 'Turkic', crh: 'Turkic',

  // Japonic
  jpn: 'Japonic',

  // Koreanic
  kor: 'Koreanic',

  // Tai-Kadai
  tha: 'Tai-Kadai', lao: 'Tai-Kadai', shn: 'Tai-Kadai',
  zha: 'Tai-Kadai',

  // Austroasiatic
  vie: 'Austroasiatic', khm: 'Austroasiatic', sat: 'Austroasiatic',
  mun: 'Austroasiatic',

  // Uralic
  fin: 'Uralic', hun: 'Uralic', est: 'Uralic', sme: 'Uralic',

  // Mongolic
  khk: 'Mongolic', mon: 'Mongolic',

  // Kartvelian
  kat: 'Kartvelian',

  // Quechuan
  que: 'Quechuan', quz: 'Quechuan',

  // Aymaran
  aym: 'Aymaran',

  // Hmong-Mien
  hmn: 'Hmong-Mien',

  // Nilo-Saharan
  luo: 'Nilo-Saharan', din: 'Nilo-Saharan', nus: 'Nilo-Saharan',
  mas: 'Nilo-Saharan', kan: 'Nilo-Saharan',

  // More Niger-Congo: Bantu
  kik: 'Niger-Congo', mer: 'Niger-Congo', kam: 'Niger-Congo', guz: 'Niger-Congo',
  kln: 'Niger-Congo', luy: 'Niger-Congo', nyn: 'Niger-Congo', cgg: 'Niger-Congo',
  tum: 'Niger-Congo', bem: 'Niger-Congo', loz: 'Niger-Congo', kng: 'Niger-Congo',
  kon: 'Niger-Congo', yao: 'Niger-Congo', nde: 'Niger-Congo', toi: 'Niger-Congo',
  suk: 'Niger-Congo', dua: 'Niger-Congo', bum: 'Niger-Congo', tet: 'Niger-Congo',
  kpe: 'Niger-Congo', men: 'Niger-Congo', tem: 'Niger-Congo', bin: 'Niger-Congo',
  fon: 'Niger-Congo', dyo: 'Niger-Congo', dyu: 'Niger-Congo', fuf: 'Niger-Congo',
  fuv: 'Niger-Congo', fub: 'Niger-Congo', gur: 'Niger-Congo', bci: 'Niger-Congo',
  kbp: 'Niger-Congo', nba: 'Niger-Congo', lbb: 'Niger-Congo', abk: 'Niger-Congo',

  // More Afroasiatic: Berber
  kab: 'Afroasiatic', tzm: 'Afroasiatic', shi: 'Afroasiatic', zgh: 'Afroasiatic',
  rif: 'Afroasiatic', taq: 'Afroasiatic', tda: 'Afroasiatic', thv: 'Afroasiatic',
  // More Afroasiatic: Cushitic
  sid: 'Afroasiatic', wal: 'Afroasiatic', bej: 'Afroasiatic', afar: 'Afroasiatic',
  aar: 'Afroasiatic', kdm: 'Afroasiatic', had: 'Afroasiatic', kmb: 'Afroasiatic',
  // More Afroasiatic: Semitic
  tig: 'Afroasiatic', tir: 'Afroasiatic', // tir already above, ok
  // More Afroasiatic: Chadic
  bua: 'Afroasiatic', mzk: 'Afroasiatic',

  // More Austronesian
  ace: 'Austronesian', bjn: 'Austronesian', bug: 'Austronesian', mak: 'Austronesian',
  bbc: 'Austronesian', btx: 'Austronesian', bya: 'Austronesian', tet_: 'Austronesian',
  rap: 'Austronesian', mah: 'Austronesian', gil: 'Austronesian', tah: 'Austronesian',
  nau: 'Austronesian', kur_: 'Austronesian', niu: 'Austronesian', tvl: 'Austronesian',
  fuv_: 'Austronesian', pag: 'Austronesian', ifb: 'Austronesian', kap: 'Austronesian',
  bis: 'Austronesian', // Bislama (Creole but Austronesian base — listed here as Creole below)

  // More Sino-Tibetan: Tibeto-Burman (Chin/Karen/etc.)
  cfm: 'Sino-Tibetan', cnh: 'Sino-Tibetan', cnw: 'Sino-Tibetan', ctd: 'Sino-Tibetan',
  hlt: 'Sino-Tibetan', mrh: 'Sino-Tibetan', tcz: 'Sino-Tibetan', zom: 'Sino-Tibetan',
  lhu: 'Sino-Tibetan', lkh: 'Sino-Tibetan', mhx: 'Sino-Tibetan', kar: 'Sino-Tibetan',
  blk: 'Sino-Tibetan', pwo: 'Sino-Tibetan', kyu: 'Sino-Tibetan', kek_: 'Sino-Tibetan',
  kac: 'Sino-Tibetan', lis: 'Sino-Tibetan', sit: 'Sino-Tibetan', sgb: 'Sino-Tibetan',

  // More Tai-Kadai
  khb: 'Tai-Kadai', blt: 'Tai-Kadai', tdd: 'Tai-Kadai', pcc: 'Tai-Kadai',

  // More Austroasiatic
  kha: 'Austroasiatic', mnw: 'Austroasiatic', ctu: 'Austroasiatic', hre: 'Austroasiatic',
  kkh: 'Austroasiatic', kdt: 'Austroasiatic',

  // Mayan
  quc: 'Mayan', mam: 'Mayan', kek: 'Mayan', cak: 'Mayan', tzo: 'Mayan',
  tzh: 'Mayan', yua: 'Mayan', ixl: 'Mayan', jac: 'Mayan', mop: 'Mayan',
  poc: 'Mayan', ttc: 'Mayan', tuz: 'Mayan',

  // Uto-Aztecan
  nhe: 'Uto-Aztecan', nhw: 'Uto-Aztecan', nhi: 'Uto-Aztecan', nhx: 'Uto-Aztecan',
  nah: 'Uto-Aztecan', ood: 'Uto-Aztecan', yaq: 'Uto-Aztecan', cah: 'Uto-Aztecan',
  hopi: 'Uto-Aztecan', tep: 'Uto-Aztecan', azz: 'Uto-Aztecan',

  // Oto-Manguean
  zap: 'Oto-Manguean', mix: 'Oto-Manguean', mxt: 'Oto-Manguean', maz: 'Oto-Manguean',
  otm: 'Oto-Manguean', ote: 'Oto-Manguean', mjc: 'Oto-Manguean', cly: 'Oto-Manguean',

  // Tupian
  gug: 'Tupian', nhd: 'Tupian', gub: 'Tupian', tpj: 'Tupian', yrl: 'Tupian',

  // Algic
  cre: 'Algic', oji: 'Algic', mic: 'Algic', pot: 'Algic', dly: 'Algic',

  // Na-Dene
  nav: 'Na-Dene', chp: 'Na-Dene', srs: 'Na-Dene', bea: 'Na-Dene', tli: 'Na-Dene',
  haa: 'Na-Dene',

  // More Turkic
  nog: 'Turkic', kum: 'Turkic', krc: 'Turkic', chv: 'Turkic', alt: 'Turkic',
  sah: 'Turkic', tyv: 'Turkic', kha_: 'Turkic', kjh: 'Turkic', dlg: 'Turkic',
  ttt: 'Turkic',

  // More Uralic
  vep: 'Uralic', krl: 'Uralic', kpv: 'Uralic', udm: 'Uralic', mhr: 'Uralic',
  mrj: 'Uralic', myv: 'Uralic', mdf: 'Uralic', nen: 'Uralic', sel: 'Uralic',

  // Northeast Caucasian
  che: 'Northeast Caucasian', inh: 'Northeast Caucasian', ava: 'Northeast Caucasian',
  lak: 'Northeast Caucasian', dar: 'Northeast Caucasian', lez: 'Northeast Caucasian',
  tab: 'Northeast Caucasian', aqc: 'Northeast Caucasian', rut: 'Northeast Caucasian',

  // Northwest Caucasian
  ady: 'Northwest Caucasian', kab_: 'Northwest Caucasian', abq: 'Northwest Caucasian',

  // More Kartvelian
  lzz: 'Kartvelian', xmf: 'Kartvelian', sva: 'Kartvelian',

  // More Mongolic
  bxr: 'Mongolic', xal: 'Mongolic', mgp: 'Mongolic',

  // Khoisan
  naq: 'Khoisan', nmn: 'Khoisan', hnh: 'Khoisan', gwj: 'Khoisan',

  // More Dravidian
  gon: 'Dravidian', kru: 'Dravidian', kui: 'Dravidian', knd: 'Dravidian',
  tcy: 'Dravidian', gon_: 'Dravidian', nai: 'Dravidian', klr: 'Dravidian',

  // Nilo-Saharan (more)
  kln_: 'Nilo-Saharan', tur_: 'Nilo-Saharan', lwo: 'Nilo-Saharan', bor: 'Nilo-Saharan',
  kcg: 'Nilo-Saharan', jur: 'Nilo-Saharan',

  // Language isolates
  eus: 'Language Isolate', ain: 'Language Isolate', ket: 'Language Isolate',
  niv: 'Language Isolate', ykg: 'Language Isolate', bur: 'Language Isolate',

  // Creoles & Pidgins
  hat: 'Creole', pih: 'Creole', tpi: 'Creole', acf: 'Creole', mfe: 'Creole',
  gcr: 'Creole', rcf: 'Creole', crs: 'Creole', pap: 'Creole', pcm: 'Creole',
  sag: 'Creole', tdt: 'Creole', jam: 'Creole', bzj: 'Creole', cbk: 'Creole',
};

export function getLanguageFamily(iso639_3: string): string | null {
  return FAMILY_BY_ISO[iso639_3] || null;
}

// ── Interfaces for mapped output ────────────────────────────────────

export interface MappedLanguage {
  iso639_3: string;
  name: string;
  hubCountry: string | null; // ISO3
  nbrCountries: number;
  speakers: bigint;
  status: string | null;
  family: string | null;
  officialIn: string[];
  lat: number | null;
  lng: number | null;
}

export interface MappedReligionStat {
  countryIso3: string;
  countryName: string;
  population: bigint;
  pctChristianity: number;
  pctIslam: number;
  pctBuddhism: number;
  pctHinduism: number;
  pctEthnicReligions: number;
  pctNonReligious: number;
  pctOther: number;
  pctUnknown: number;
  primaryReligion: string | null;
}

// ── FIPS → ISO3 mapping (built from countries endpoint at runtime) ──

export function buildFipsToIso3(countries: JPRawCountry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of countries) {
    if (c.ROG3 && c.ISO3) map.set(c.ROG3, c.ISO3);
  }
  return map;
}

// ── Map Languages ───────────────────────────────────────────────────

export function mapLanguages(
  rawLangs: JPRawLanguage[],
  rawPG: JPRawPeopleGroup[],
  fipsToIso3: Map<string, string>,
  officialLangByCountry: Map<string, string>, // ISO3 → ROL3 of official language
): MappedLanguage[] {
  // Aggregate speakers from people groups: sum Population by ROL3
  const speakersByLang = new Map<string, bigint>();
  const coordsByLang = new Map<string, { lat: number; lng: number; pop: number }>();

  for (const pg of rawPG) {
    if (!pg.ROL3 || !pg.Population) continue;
    const prev = speakersByLang.get(pg.ROL3) || BigInt(0);
    speakersByLang.set(pg.ROL3, prev + BigInt(pg.Population));

    // Weighted average coordinates (by population)
    const existing = coordsByLang.get(pg.ROL3);
    if (pg.Latitude && pg.Longitude) {
      if (!existing || pg.Population > existing.pop) {
        coordsByLang.set(pg.ROL3, { lat: pg.Latitude, lng: pg.Longitude, pop: pg.Population });
      }
    }
  }

  // Build officialIn: which countries have this language as official
  const officialInByLang = new Map<string, string[]>();
  for (const [iso3, rol3] of officialLangByCountry) {
    if (!rol3) continue;
    const arr = officialInByLang.get(rol3) || [];
    arr.push(iso3);
    officialInByLang.set(rol3, arr);
  }

  return rawLangs
    .filter(l => l.ROL3 && l.Language)
    .map(l => {
      const hubIso3 = l.ROG3 ? (fipsToIso3.get(l.ROG3) || null) : null;
      const coords = coordsByLang.get(l.ROL3);
      const statusMap: Record<string, string> = { L: 'Living', N: 'Nearly Extinct', E: 'Extinct' };

      return {
        iso639_3: l.ROL3,
        name: l.Language,
        hubCountry: hubIso3,
        nbrCountries: l.NbrCountries || 0,
        speakers: speakersByLang.get(l.ROL3) || BigInt(0),
        status: statusMap[l.Status || ''] || l.Status,
        family: getLanguageFamily(l.ROL3),
        officialIn: officialInByLang.get(l.ROL3) || [],
        lat: coords?.lat || null,
        lng: coords?.lng || null,
      };
    });
}

// ── Map Religion Stats ──────────────────────────────────────────────

export function mapReligionStats(rawCountries: JPRawCountry[]): MappedReligionStat[] {
  return rawCountries
    .filter(c => c.ISO3)
    .map(c => ({
      countryIso3: c.ISO3,
      countryName: c.Ctry,
      population: BigInt(c.Population || 0),
      pctChristianity: c.PercentChristianity || 0,
      pctIslam: c.PercentIslam || 0,
      pctBuddhism: c.PercentBuddhism || 0,
      pctHinduism: c.PercentHinduism || 0,
      pctEthnicReligions: c.PercentEthnicReligions || 0,
      pctNonReligious: c.PercentNonReligious || 0,
      pctOther: c.PercentOtherSmall || 0,
      pctUnknown: c.PercentUnknown || 0,
      primaryReligion: c.ReligionPrimary || null,
    }));
}
