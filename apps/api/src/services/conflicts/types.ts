export interface ACLEDRawEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  country: string;
  admin1: string;
  latitude: string;
  longitude: string;
  fatalities: string;
  notes: string;
  iso: string;
  disorder_type: string;
}

export interface ACLEDApiResponse {
  status: number;
  success: boolean;
  count: number;
  total_count: number;
  data: ACLEDRawEvent[];
}

export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ConflictEventProperties {
  id: string;
  date: string;
  eventType: string;
  subEventType: string;
  disorderType: string;
  actor1: string;
  actor2: string;
  country: string;
  iso: string;
  region: string;
  fatalities: number;
  severity: ConflictSeverity;
  notes: string;
}

export interface ConflictSummary {
  country: string;
  iso: string;
  totalEvents: number;
  totalFatalities: number;
  severity: ConflictSeverity;
  active: boolean;
  lastEventDate: string;
  lat: number;
  lng: number;
}

export interface ConflictsResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: ConflictEventProperties;
  }>;
  summary: ConflictSummary[];
}
