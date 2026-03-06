// Conflict type
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
  involvedISO?: string[]; // ISO 3166-1 alpha-3 codes for involved countries
  alliesByFaction?: { [faction: string]: { isoCodes: string[]; color: string } };
  
  // New optional fields for expanded conflicts
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