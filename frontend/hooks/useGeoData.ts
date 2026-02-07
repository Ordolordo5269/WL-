import { useState, useEffect, useCallback, useRef } from 'react';
import { geoService, GeoCity, GeoRegion } from '../services/geo.service';

export interface UseGeoDataReturn {
  cities: GeoCity[];
  regions: GeoRegion[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch cities and regions for a country
 * @param iso2 - ISO 3166-1 alpha-2 country code (e.g., 'US', 'ES')
 * @param enabled - Whether to fetch data (for lazy loading)
 */
export function useGeoData(iso2: string | null, enabled: boolean = true): UseGeoDataReturn {
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track last fetched iso2 to avoid duplicate requests
  const lastFetchedRef = useRef<string | null>(null);

  const fetchData = useCallback(async (code: string) => {
    // Skip if already fetched for this code
    if (lastFetchedRef.current === code && cities.length > 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch cities and regions in parallel
      const [citiesData, regionsData] = await Promise.all([
        geoService.getCities(code, 10),
        geoService.getRegions(code),
      ]);

      setCities(citiesData);
      setRegions(regionsData);
      lastFetchedRef.current = code;

      if (citiesData.length === 0 && regionsData.length === 0) {
        // Not an error, just no data available
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching geo data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load geographic data');
      setCities([]);
      setRegions([]);
    } finally {
      setIsLoading(false);
    }
  }, [cities.length]);

  const refetch = useCallback(() => {
    if (iso2) {
      lastFetchedRef.current = null; // Force refetch
      fetchData(iso2);
    }
  }, [iso2, fetchData]);

  useEffect(() => {
    if (iso2 && enabled) {
      fetchData(iso2);
    } else if (!iso2) {
      // Reset state when no country selected
      setCities([]);
      setRegions([]);
      setError(null);
      lastFetchedRef.current = null;
    }
  }, [iso2, enabled, fetchData]);

  return {
    cities,
    regions,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to search places with debounce
 */
export function useGeoSearch(query: string, countryCode?: string, debounceMs: number = 300) {
  const [results, setResults] = useState<GeoCity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset if query is too short
    if (!query || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const places = await geoService.searchPlaces(query, countryCode, 10);
        setResults(places);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, countryCode, debounceMs]);

  return { results, isSearching };
}


