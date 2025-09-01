import { useCallback, useEffect, useRef, useState } from 'react';
import { cultureService, TCultureData } from '../services/culture-service';

export interface UseCultureDataReturn {
  data: TCultureData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCultureData(iso3: string | null, countryName: string | null): UseCultureDataReturn {
  const [data, setData] = useState<TCultureData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (code3: string, name: string | null) => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await cultureService.getCultureData(code3, name);
      if (currentRequestId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load culture data';
      setError(message);
      setData(null);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => {
    if (iso3) fetchData(iso3, countryName ?? null);
  }, [iso3, countryName, fetchData]);

  useEffect(() => {
    if (iso3) {
      fetchData(iso3, countryName ?? null);
    } else {
      requestIdRef.current++;
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [iso3, countryName, fetchData]);

  return { data, isLoading, error, refetch };
}



