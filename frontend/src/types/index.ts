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