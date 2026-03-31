/* ────────────────────────────────────────────────────────────
 *  Demographics — shared types (API-backed)
 * ──────────────────────────────────────────────────────────── */

export type DemographicTab = 'language' | 'religion' | 'diaspora';

/* ── Language (from /api/demographics/languages) ── */
export interface Language {
  id: string;
  iso639_3: string;
  name: string;
  hubCountry: string | null;
  nbrCountries: number;
  speakers: number;
  status: string | null;      // Living, Nearly Extinct, Extinct
  family: string | null;      // Indo-European, Sino-Tibetan, etc.
  officialIn: string[];       // ISO3 codes
  lat: number | null;
  lng: number | null;
}

/* ── Religion stat (from /api/demographics/religion) ── */
export interface ReligionStat {
  id: string;
  countryIso3: string;
  countryName: string | null;
  population: number;
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

/* ── Migration corridor (from /api/demographics/diaspora) ── */
export interface MigrationCorridor {
  originIso3: string;
  originName: string | null;
  destinationIso3: string;
  destinationName: string | null;
  year: number;
  refugees: number;
  asylumSeekers: number;
  returnedRefugees: number;
  idps: number;
  stateless: number;
  otherOfConcern: number;
  otherInNeed: number;
  hostCommunity: number;
}

/* ── Top origin/destination aggregated ── */
export interface DiasporaOrigin {
  iso3: string;
  name: string | null;
  refugees: number;
  asylumSeekers: number;
  idps: number;
  stateless: number;
  returnedRefugees: number;
  hostCommunity: number;
}

/* ── Diaspora breakdown categories for visualization ── */
export const DIASPORA_CATEGORIES = [
  { key: 'refugees', label: 'Refugees', color: '#ef4444' },
  { key: 'idps', label: 'IDPs', color: '#f97316' },
  { key: 'asylumSeekers', label: 'Asylum Seekers', color: '#eab308' },
  { key: 'stateless', label: 'Stateless', color: '#8b5cf6' },
  { key: 'returnedRefugees', label: 'Returned', color: '#22c55e' },
  { key: 'hostCommunity', label: 'Host Community', color: '#06b6d4' },
] as const;

/* ── Color palettes ── */

export const RELIGION_COLOR: Record<string, string> = {
  Christianity: '#3b82f6',
  Islam: '#22c55e',
  Hinduism: '#f97316',
  Buddhism: '#eab308',
  'Ethnic Religions': '#8b5cf6',
  'Non-Religious': '#64748b',
  Judaism: '#6366f1',
  Other: '#94a3b8',
  Unknown: '#475569',
};

export const LANGUAGE_FAMILY_COLOR: Record<string, string> = {
  'Indo-European': '#3b82f6',
  'Sino-Tibetan': '#ef4444',
  'Afroasiatic': '#22c55e',
  'Niger-Congo': '#f59e0b',
  'Austronesian': '#06b6d4',
  'Dravidian': '#f97316',
  'Turkic': '#8b5cf6',
  'Japonic': '#ec4899',
  'Koreanic': '#f472b6',
  'Tai-Kadai': '#14b8a6',
  'Austroasiatic': '#84cc16',
  'Uralic': '#6366f1',
  'Mongolic': '#a855f7',
  'Quechuan': '#fb923c',
  'Aymaran': '#d946ef',
  'Kartvelian': '#0ea5e9',
  'Nilo-Saharan': '#10b981',
  'Hmong-Mien': '#f43f5e',
  'Creole': '#78716c',
  'Language Isolate': '#a3a3a3',
};

export const LANG_STATUS_COLOR: Record<string, string> = {
  Living: '#22c55e',
  'Nearly Extinct': '#ef4444',
  Extinct: '#64748b',
};

export function languageFamilyColor(family: string | null): string {
  if (!family) return '#64748b';
  return LANGUAGE_FAMILY_COLOR[family] ?? '#64748b';
}

export function religionColor(key: string | null): string {
  if (!key) return '#64748b';
  return RELIGION_COLOR[key] ?? '#94a3b8';
}
