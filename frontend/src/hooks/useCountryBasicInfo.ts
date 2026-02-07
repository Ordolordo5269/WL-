import { useState, useEffect, useCallback } from 'react';
import { countryBasicInfoService, CountryBasicInfo } from '../services/country-basic-info.service';

export interface UseCountryBasicInfoReturn {
  countryData: CountryBasicInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCountryBasicInfo(countryName: string | null): UseCountryBasicInfoReturn {
  const [countryData, setCountryData] = useState<CountryBasicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCountryData = useCallback(async (country: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await countryBasicInfoService.getCountryBasicInfo(country);
      
      if (data) {
        setCountryData(data);
      } else {
        setError(`No basic information found for ${country}`);
        setCountryData(null);
      }
    } catch (err) {
      console.error('Error fetching country basic info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load country information');
      setCountryData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (countryName) {
      fetchCountryData(countryName);
    }
  }, [countryName, fetchCountryData]);

  useEffect(() => {
    if (countryName) {
      fetchCountryData(countryName);
    } else {
      setCountryData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [countryName, fetchCountryData]);

  return {
    countryData,
    isLoading,
    error,
    refetch
  };
} 