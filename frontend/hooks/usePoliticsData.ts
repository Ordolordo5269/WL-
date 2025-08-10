import { useCallback, useEffect, useState } from 'react';
import { politicsService, TPoliticsData } from '../services/politics-service';

export interface UsePoliticsDataReturn {
  data: TPoliticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePoliticsData(countryName: string | null, iso3: string | null): UsePoliticsDataReturn {
  const [data, setData] = useState<TPoliticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (name: string, code3: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await politicsService.getPoliticsData(name, code3);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load politics data';
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (countryName && iso3) fetchData(countryName, iso3);
  }, [countryName, iso3, fetchData]);

  useEffect(() => {
    if (countryName && iso3) {
      fetchData(countryName, iso3);
    } else {
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [countryName, iso3, fetchData]);

  return { data, isLoading, error, refetch };
}


