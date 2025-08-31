import { useCallback, useEffect, useRef, useState } from 'react';
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
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (name: string, code3: string) => {
    // Increment request id and capture local id for this run
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    // Clear previous data immediately to avoid showing stale entries
    setData(null);
    try {
      const result = await politicsService.getPoliticsData(name, code3);
      // Ignore if a newer request has been started
      if (currentRequestId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load politics data';
      setError(message);
      setData(null);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => {
    if (countryName && iso3) fetchData(countryName, iso3);
  }, [countryName, iso3, fetchData]);

  useEffect(() => {
    if (countryName && iso3) {
      fetchData(countryName, iso3);
    } else {
      // Invalidate any in-flight requests
      requestIdRef.current++;
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [countryName, iso3, fetchData]);

  return { data, isLoading, error, refetch };
}


