import { useState, useEffect, useCallback } from 'react';
import { economyService, EconomyData } from '../services/economy-service';

export interface UseEconomyDataReturn {
  economyData: EconomyData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEconomyData(countryName: string | null): UseEconomyDataReturn {
  const [economyData, setEconomyData] = useState<EconomyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEconomyData = useCallback(async (country: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure economy data is loaded first
      await economyService.loadEconomyData();
      
      // Get economy data for the country
      const data = economyService.getEconomyDataByCountry(country);
      setEconomyData(data);
      
      if (!data) {
        setError(`No economic data found for ${country}`);
      }
    } catch (err) {
      console.error('Error fetching economy data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load economic data');
      setEconomyData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (countryName) {
      fetchEconomyData(countryName);
    }
  }, [countryName, fetchEconomyData]);

  useEffect(() => {
    if (countryName) {
      fetchEconomyData(countryName);
    } else {
      setEconomyData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [countryName, fetchEconomyData]);

  return {
    economyData,
    isLoading,
    error,
    refetch
  };
} 