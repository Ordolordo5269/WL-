import { useCallback, useEffect, useRef, useState } from 'react';
import { infrastructureService } from '../services/infrastructure-service';
import type { TInfrastructureData } from '../services/infrastructure-service';

export interface UseInfrastructureDataReturn {
  data: TInfrastructureData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInfrastructureData(iso3: string | null, countryName: string | null, enabled: boolean = true): UseInfrastructureDataReturn {
  const [data, setData] = useState<TInfrastructureData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (code3: string, name: string | null) => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await infrastructureService.getInfrastructureData(code3, name);
      if (currentRequestId !== requestIdRef.current) return;
      setData(result);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load infrastructure data';
      setError(message);
      setData(null);
    } finally {
      if (currentRequestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (iso3 && enabled) fetchData(iso3, countryName ?? null);
  }, [iso3, countryName, fetchData, enabled]);

  useEffect(() => {
    if (iso3 && enabled) {
      fetchData(iso3, countryName ?? null);
    } else if (!enabled) {
      setIsLoading(false);
    } else {
      requestIdRef.current++;
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [iso3, countryName, enabled, fetchData]);

  return { data, isLoading, error, refetch };
}
