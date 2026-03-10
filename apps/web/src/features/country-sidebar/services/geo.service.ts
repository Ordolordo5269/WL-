// GeoDB Cities & Regions Service
// Frontend service for fetching city and region data from backend

export interface GeoCity {
  id: number;
  wikiDataId: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  latitude: number;
  longitude: number;
  population: number;
  elevationMeters: number | null;
}

export interface GeoRegion {
  isoCode: string;
  fipsCode: string | null;
  name: string;
  countryCode: string;
  wikiDataId: string | null;
}

export interface GeoCacheStatus {
  totalEntries: number;
  expiredEntries: number;
  countriesCached: string[];
}

class GeoService {
  private readonly baseUrl: string;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    this.baseUrl = envUrl && envUrl.length > 0 ? envUrl : 'http://localhost:3001';
  }

  /**
   * Get top cities for a country
   */
  async getCities(iso2: string, limit: number = 10): Promise<GeoCity[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/geo/countries/${iso2.toUpperCase()}/cities?limit=${limit}`
      );

      if (!response.ok) {
        console.warn(`Failed to fetch cities for ${iso2}: ${response.status}`);
        return [];
      }

      const json = await response.json();
      return (json.data || []) as GeoCity[];
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
  }

  /**
   * Get administrative regions for a country
   */
  async getRegions(iso2: string): Promise<GeoRegion[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/geo/countries/${iso2.toUpperCase()}/regions`
      );

      if (!response.ok) {
        console.warn(`Failed to fetch regions for ${iso2}: ${response.status}`);
        return [];
      }

      const json = await response.json();
      return (json.data || []) as GeoRegion[];
    } catch (error) {
      console.error('Error fetching regions:', error);
      return [];
    }
  }

  /**
   * Get details for a specific place
   */
  async getPlaceDetails(placeId: string | number): Promise<GeoCity | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geo/places/${placeId}`);

      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      return json.data as GeoCity;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  /**
   * Search places globally or within a country
   */
  async searchPlaces(query: string, countryCode?: string, limit: number = 10): Promise<GeoCity[]> {
    if (!query || query.length < 2) return [];

    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
      });

      if (countryCode) {
        params.set('countryCode', countryCode.toUpperCase());
      }

      const response = await fetch(`${this.baseUrl}/api/geo/search?${params}`);

      if (!response.ok) {
        return [];
      }

      const json = await response.json();
      return (json.data || []) as GeoCity[];
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  /**
   * Get cache status (for debugging)
   */
  async getCacheStatus(): Promise<GeoCacheStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geo/cache/status`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching cache status:', error);
      return null;
    }
  }

  /**
   * Format population for display
   */
  formatPopulation(population: number): string {
    if (population >= 1000000) {
      return `${(population / 1000000).toFixed(1)}M`;
    }
    if (population >= 1000) {
      return `${(population / 1000).toFixed(0)}K`;
    }
    return population.toLocaleString();
  }

  /**
   * Format elevation for display
   */
  formatElevation(meters: number | null): string {
    if (meters === null || meters === undefined) return 'N/A';
    return `${meters.toLocaleString()}m`;
  }
}

export const geoService = new GeoService();


