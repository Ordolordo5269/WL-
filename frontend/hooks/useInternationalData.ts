import { useCallback, useEffect, useRef, useState } from 'react';
import { internationalService, TInternationalData } from '../services/international-service';

export interface UseInternationalDataReturn {
  data: TInternationalData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInternationalData(iso3: string | null, countryName: string | null): UseInternationalDataReturn {
  const [data, setData] = useState<TInternationalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (code3: string, name: string | null) => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await internationalService.getInternationalData(code3, name);
      if (currentRequestId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load international data';
      setError(message);
      setData(null);
    } finally {
      if (currentRequestId === requestIdRef.current) setIsLoading(false);
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







