// ============================
// UCDP API Response Types
// ============================

/** Generic paginated response wrapper from the UCDP API */
export interface UcdpApiResponse<T> {
  TotalCount: number;
  TotalPages: number;
  PreviousPageUrl: string;
  NextPageUrl: string;
  Result: T[];
}

// ============================
// Raw API record shapes (snake_case as returned by the API)
// ============================

export interface RawGedEvent {
  id: number;
  relid: string;
  year: number;
  active_year: number; // 1 or 0
  type_of_violence: number;
  conflict_new_id: number | null;
  conflict_name: string;
  dyad_name: string | null;
  side_a: string;
  side_b: string;
  country: string;
  country_id: number;
  region: string;
  latitude: number;
  longitude: number;
  geom_wkt: string | null;
  where_prec: number | null;
  where_description: string | null;
  adm_1: string | null;
  adm_2: string | null;
  date_start: string; // "YYYY-MM-DD"
  date_end: string;
  deaths_a: number;
  deaths_b: number;
  deaths_civilians: number;
  deaths_unknown: number;
  best: number;
  high: number;
  low: number;
  source_article: string | null;
  source_original: string | null;
}

export interface RawConflict {
  conflict_id: string;
  location: string;
  side_a: string;
  side_a_id: string | null;
  side_a_2nd: string | null;
  side_b: string;
  side_b_id: string | null;
  side_b_2nd: string | null;
  incompatibility: string | number;
  territory_name: string | null;
  year: string | number;
  intensity_level: string | number;
  cumulative_intensity: string | number;
  type_of_conflict: string | number;
  start_date: string;
  start_date2: string | null;
  ep_end: string | number; // "0" or "1"
  ep_end_date: string | null;
  region: string | number;
  gwno_a: string | null;
  gwno_loc: string | null;
}

export interface RawBattleDeaths {
  conflict_id: string;
  dyad_id: string;
  location: string;
  side_a: string;
  side_b: string;
  year: string | number;
  bd_best: string | number;
  bd_low: string | number;
  bd_high: string | number;
  type_of_conflict: string | number;
  battle_location: string | null;
  region: string | number;
}

export interface RawNonState {
  conflict_id: string;
  dyad_id: string;
  side_a_name: string;
  side_b_name: string;
  year: string | number;
  best_fatality_estimate: string | number;
  low_fatality_estimate: string | number;
  high_fatality_estimate: string | number;
  location: string;
  region: string | number;
  ep_end: string | number;
  start_date: string | null;
}

export interface RawOneSided {
  conflict_id: string;
  actor_id: string;
  actor_name: string;
  year: string | number;
  best_fatality_estimate: string | number;
  low_fatality_estimate: string | number;
  high_fatality_estimate: string | number;
  is_government_actor: string | number; // "0" or "1"
  location: string;
  region: string | number;
}

// ============================
// Filter / query params for each endpoint
// ============================

export interface GedEventFilters {
  Country?: string;      // Gleditsch-Ward code(s), comma-separated e.g. "90,91"
  StartDate?: string;    // "YYYY-MM-DD"
  EndDate?: string;      // "YYYY-MM-DD"
  TypeOfViolence?: string; // "1", "2", "3", or "1,3"
  Geography?: string;    // bounding box "lat1 lon1,lat2 lon2"
}

export interface ConflictFilters {
  Country?: string;
  Year?: string;
  TypeOfConflict?: string;
}

export interface BattleDeathsFilters {
  Country?: string;
  Year?: string;
}

export interface NonStateFilters {
  Country?: string;
  Year?: string;
}

export interface OneSidedFilters {
  Country?: string;
  Year?: string;
}

/** Shared pagination params sent to every endpoint */
export interface PaginationParams {
  pagesize?: number;
  page?: number;
}

// ============================
// Sync status types
// ============================

export type SyncDataset =
  | 'gedevents'
  | 'ucdpprioconflict'
  | 'battledeaths'
  | 'nonstate'
  | 'onesided'
  | 'candidate';

export type SyncStatus = 'running' | 'completed' | 'failed';

export interface SyncResult {
  dataset: SyncDataset;
  version: string;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  status: SyncStatus;
  errors?: unknown;
}

// ============================
// Repo-level filter types (used by repo.ts, service.ts, controller.ts)
// ============================

export interface UcdpEventFilters {
  year?: number;
  country?: string;
  region?: string;
  typeOfViolence?: number;
  dateFrom?: string;
  dateTo?: string;
  bbox?: { north: number; south: number; east: number; west: number };
  limit?: number;
  offset?: number;
}

export interface UcdpConflictFilters {
  year?: number;
  location?: string;
  intensityLevel?: number;
  typeOfConflict?: number;
  region?: number;
}

export interface UcdpBattleDeathsFilters {
  year?: number;
  conflictId?: string;
  location?: string;
}

export interface UcdpNonStateFilters {
  year?: number;
  location?: string;
}

export interface UcdpOneSidedFilters {
  year?: number;
  location?: string;
}

export interface UcdpSyncBody {
  dataset: 'gedevents' | 'conflicts' | 'battledeaths' | 'nonstate' | 'onesided' | 'candidate' | 'all';
  version?: string;
}

// ============================
// GeoJSON types (used by service.ts)
// ============================

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: number;
    bestEstimate: number;
    typeOfViolence: number;
    conflictName: string;
    sideA: string;
    sideB: string;
    dateStart: string;
    country: string;
    deathsCivilians: number;
    deathsA: number;
    deathsB: number;
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

