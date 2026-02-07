import { useState, useEffect, useCallback } from 'react';
import { economyService } from '../services/economy-service';
import type { EconomyData } from '../services/economy-service';

export interface UseEconomyDataReturn {
  economyData: EconomyData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEconomyData(iso3: string | null, countryName?: string | null, enabled: boolean = true): UseEconomyDataReturn {
  const [economyData, setEconomyData] = useState<EconomyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEconomyData = useCallback(async (code3: string, country?: string | null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await economyService.getEconomyDataByISO3(code3, country ?? null);
      setEconomyData(data);
    } catch (err) {
      console.error('Error fetching economy data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load economic data');
      setEconomyData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (iso3 && enabled) {
      fetchEconomyData(iso3, countryName);
    }
  }, [iso3, countryName, fetchEconomyData, enabled]);

  useEffect(() => {
    if (iso3 && enabled) {
      fetchEconomyData(iso3, countryName);
    } else if (!enabled) {
      // Don't clear data when disabled, just don't fetch
      setIsLoading(false);
    } else {
      setEconomyData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [iso3, countryName, enabled, fetchEconomyData]);

  return {
    economyData,
    isLoading,
    error,
    refetch
  };
} 