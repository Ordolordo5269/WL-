// ── ACLED-driven Conflict types ──

export interface AcledConflict {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  description: string;
  status: 'WAR' | 'WARM' | 'IMPROVING' | 'RESOLVED' | 'FROZEN';
  involvedISO: string[];
  coordinates: { lat: number; lng: number };
  startDate: string;
  escalationDate?: string;
  endDate?: string;
  sources: string[];
  totalEvents: number;
  totalFatalities: number;
  lastEventDate?: string;
  // Populated on detail view
  recentEvents?: AcledEvent[];
}

export interface AcledEvent {
  id: string;
  eventIdCnty: string;
  eventDate: string;
  year: number;
  timePrecision: number;
  disorderType?: string;
  eventType: string;        // "Battles", "Explosions/Remote violence", etc.
  subEventType: string;     // "Armed clash", "Shelling/artillery", etc.
  actor1: string;           // Who did it
  assocActor1?: string;
  inter1: number;           // 1=State, 2=Rebel, 3=Political militia, etc.
  actor2?: string;          // Against whom
  assocActor2?: string;
  inter2?: number;
  interaction: number;
  civilianTargeting?: string;
  iso: number;
  country: string;
  region: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  location?: string;
  latitude: number;
  longitude: number;
  geoPrecision?: number;
  source?: string;
  sourceScale?: string;
  notes?: string;           // What happened
  fatalities: number;
  tags?: string;
}

// Legacy alias for backward compatibility
export interface Conflict {
  id: string;
  country: string;
  region: string;
  conflictType: string;
  description: string;
  date: string;
  casualties: number;
  status: 'War' | 'Warm' | 'Improving';
  coordinates: { lat: number; lng: number };
  involvedISO?: string[];
  alliesByFaction?: { [faction: string]: { isoCodes: string[]; color: string } };
  startDate?: string;
  escalationDate?: string;
  casualtiesDetailed?: {
    military?: { [key: string]: number };
    civilian?: { total: number };
  };
  displacedPersons?: number;
  factions?: {
    [factionName: string]: {
      allies?: string[];
      militarySupport?: {
        weapons?: string[];
        aidValue?: string;
        strategicAssets?: string[];
      };
      goals?: string[];
    };
  };
  internationalResponse?: {
    sanctions?: {
      imposedBy?: string[];
      targets?: string[];
    };
    peaceEfforts?: string[];
  };
  notableEvents?: Array<{
    title: string;
    date: string;
  }>;
  sources?: string[];
}

// NewsArticle type
export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  url: string;
  conflictId?: string;
  description?: string;
  imageUrl?: string;
}

// NewsAPI types for internal API response typing
export interface NewsAPIArticle {
  source: { name: string };
  author?: string;
  title: string;
  description?: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  content?: string;
}

export interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
} 