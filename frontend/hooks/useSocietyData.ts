import { useCallback, useEffect, useState } from 'react';
import { societyService, TSocietyIndicators } from '../services/society-service';

export interface UseSocietyDataReturn {
  data: TSocietyIndicators | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Expects ISO3 (cca3). The Basic Info section provides `cca3` in its payload.
export function useSocietyData(iso3: string | null): UseSocietyDataReturn {
  const [data, setData] = useState<TSocietyIndicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (code3: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await societyService.getSocietyIndicatorsByISO3(code3);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load society indicators';
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (iso3) fetchData(iso3);
  }, [iso3, fetchData]);

  useEffect(() => {
    if (iso3) {
      fetchData(iso3);
    } else {
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [iso3, fetchData]);

  return { data, isLoading, error, refetch };
}


