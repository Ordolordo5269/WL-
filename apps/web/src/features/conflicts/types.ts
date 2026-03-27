// ── API v2 response types ──

export type ConflictStatus = 'WAR' | 'WARM' | 'FROZEN' | 'IMPROVING' | 'RESOLVED' | 'ONE_SIDED';

export interface ConflictCasualty {
  id: string;
  date: string;
  military: number | null;
  civilian: number | null;
  total: number;
  source: string | null;
}

export interface ConflictFactionSupport {
  supporterISO: string;
  supportType: string;
  weapons: string[];
  aidValue: string | null;
  strategicAssets: string[];
}

export interface ConflictFaction {
  id: string;
  name: string;
  color: string | null;
  goals: string[];
  allies: string[];
  support: ConflictFactionSupport[];
}

export interface ConflictEvent {
  id: string;
  title: string;
  date: string;
  description: string | null;
  eventType: string | null;
  location: string | null;
  coordinates: { lat: number; lng: number } | null;
}

export interface ConflictUpdate {
  id: string;
  date: string;
  status: ConflictStatus | null;
  description: string;
  source: string | null;
}

export interface ConflictNews {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string | null;
  imageUrl: string | null;
}

/** Raw UCDP GED event from the backend */
export interface UcdpEvent {
  id: string;
  ucdpEventId: number;
  year: number;
  conflictName: string;
  dyadName: string;
  sideA: string;
  sideB: string;
  dateStart: string;
  dateEnd: string;
  deathsA: number;
  deathsB: number;
  deathsCivilians: number;
  deathsUnknown: number;
  bestEstimate: number;
  highEstimate: number;
  lowEstimate: number;
  country: string;
  countryId: number;
  region: string;
  latitude: number;
  longitude: number;
  whereDescription: string | null;
  adm1: string | null;
  adm2: string | null;
  typeOfViolence: number;
  sourceArticle: string | null;
  sourceHeadline: string | null;
}

export interface ConflictV2 {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  conflictType: string;
  description: string;
  status: ConflictStatus;
  startDate: string;
  escalationDate: string | null;
  endDate: string | null;
  coordinates: { lat: number; lng: number };
  involvedISO: string[];
  sources: string[];
  casualties: ConflictCasualty[];
  factions: ConflictFaction[];
  _count: { events: number; ucdpEvents?: number };

  // UCDP fields
  sideA?: string;
  sideB?: string;
  dyadName?: string;
  typeOfViolence?: number;
  dataSource?: 'ucdp' | 'manual';
  lastSyncedAt?: string;
  ucdpConflictId?: number;
}

export interface ConflictDetail extends ConflictV2 {
  events: ConflictEvent[];
  updates: ConflictUpdate[];
  news: ConflictNews[];
  ucdpEvents?: UcdpEvent[];
}

export interface ConflictFiltersParams {
  region?: string;
  status?: ConflictStatus;
  country?: string;
  from?: string;
  to?: string;
  dataSource?: 'ucdp' | 'manual' | 'all';
  typeOfViolence?: number;
}

// ── Severity helpers ──

const STATUS_SEVERITY: Record<ConflictStatus, number> = {
  WAR: 5,
  WARM: 3,
  ONE_SIDED: 4,
  FROZEN: 2,
  IMPROVING: 1,
  RESOLVED: 0,
};

export function statusToSeverity(status: ConflictStatus): number {
  return STATUS_SEVERITY[status] ?? 0;
}

export function severityColor(severity: number): string {
  if (severity >= 5) return '#ef4444'; // red
  if (severity >= 4) return '#dc2626'; // dark red (one-sided)
  if (severity >= 3) return '#f97316'; // orange
  if (severity >= 2) return '#eab308'; // yellow
  if (severity >= 1) return '#22c55e'; // green
  return '#6b7280'; // gray
}

export function statusLabel(status: ConflictStatus): string {
  const labels: Record<ConflictStatus, string> = {
    WAR: 'War',
    WARM: 'Warm',
    ONE_SIDED: 'One-sided',
    FROZEN: 'Frozen',
    IMPROVING: 'Improving',
    RESOLVED: 'Resolved',
  };
  return labels[status] ?? status;
}

export function violenceTypeLabel(type: number): string {
  switch (type) {
    case 1: return 'State-based';
    case 2: return 'Non-state';
    case 3: return 'One-sided';
    default: return 'Unknown';
  }
}

export function violenceTypeColor(type: number): string {
  switch (type) {
    case 1: return '#ef4444'; // red - state-based
    case 2: return '#f97316'; // orange - non-state
    case 3: return '#a855f7'; // purple - one-sided
    default: return '#6b7280';
  }
}
