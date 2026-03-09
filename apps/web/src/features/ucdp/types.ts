// UCDP GED Event (from API response)
export interface UcdpGedEvent {
  id: number;
  year: number;
  typeOfViolence: number; // 1=state-based, 2=non-state, 3=one-sided
  conflictName: string;
  sideA: string;
  sideB: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  dateStart: string;
  dateEnd: string;
  deathsA: number;
  deathsB: number;
  deathsCivilians: number;
  bestEstimate: number;
  highEstimate: number;
  lowEstimate: number;
  whereDescription: string | null;
  adm1: string | null;
}

// UCDP Conflict (armed conflicts)
export interface UcdpConflict {
  id: string;
  ucdpConflictId: string;
  location: string;
  sideA: string;
  sideB: string;
  incompatibility: number; // 1=territory, 2=government
  territoryName: string | null;
  year: number;
  intensityLevel: number; // 1=minor, 2=war
  typeOfConflict: number; // 1-4
  startDate: string;
  region: number;
  epEnd: boolean;
}

// GeoJSON response from backend
export interface UcdpGeoJsonResponse {
  data: GeoJSON.FeatureCollection<GeoJSON.Point, UcdpEventProperties>;
}

export interface UcdpEventProperties {
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
}

// Filter params
export interface UcdpEventFilters {
  year?: number;
  country?: string;
  region?: string;
  typeOfViolence?: number;
  dateFrom?: string;
  dateTo?: string;
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

// Stats
export interface UcdpStats {
  totalEvents: number;
  byYear: Record<string, number>;
  byType: Record<string, number>;
  byRegion: Record<string, number>;
}

// Violence type helpers
export const VIOLENCE_TYPES: Record<number, { label: string; color: string }> = {
  1: { label: 'State-based', color: '#ef4444' },    // red
  2: { label: 'Non-state', color: '#f97316' },       // orange
  3: { label: 'One-sided', color: '#eab308' },       // yellow
};

export function violenceTypeLabel(type: number): string {
  return VIOLENCE_TYPES[type]?.label ?? 'Unknown';
}

export function violenceTypeColor(type: number): string {
  return VIOLENCE_TYPES[type]?.color ?? '#6b7280';
}

export const INTENSITY_LABELS: Record<number, string> = {
  1: 'Minor (25-999 deaths/year)',
  2: 'War (1000+ deaths/year)',
};

export const CONFLICT_TYPE_LABELS: Record<number, string> = {
  1: 'Extrasystemic',
  2: 'Interstate',
  3: 'Intrastate',
  4: 'Internationalized intrastate',
};

export const REGION_LABELS: Record<number, string> = {
  1: 'Europe',
  2: 'Middle East',
  3: 'Asia',
  4: 'Africa',
  5: 'Americas',
};
