import { useCallback, useEffect, useState } from 'react';
import { societyService, TSocietyIndicators } from '../services/society-service';

export interface SocietySeriesData {
  populationSeries: Array<{ year: number; value: number | null }>;
  populationGrowthSeries: Array<{ year: number; value: number | null }>;
  birthSeries: Array<{ year: number; value: number | null }>;
  deathSeries: Array<{ year: number; value: number | null }>;
}

export interface UseSocietyDataReturn {
  data: TSocietyIndicators | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  series: SocietySeriesData | null;
  fetchIndicatorSeries: (indicatorCode: string, limitYears?: number) => Promise<Array<{ year: number; value: number | null }>>;
}

// Expects ISO3 (cca3). The Basic Info section provides `cca3` in its payload.
export function useSocietyData(iso3: string | null, enabled: boolean = true): UseSocietyDataReturn {
  const [data, setData] = useState<TSocietyIndicators | null>(null);
  const [series, setSeries] = useState<SocietySeriesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (code3: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await societyService.getSocietyIndicatorsByISO3(code3);
      setData(result);
      const [populationSeries, populationGrowthSeries, birthSeries, deathSeries] = await Promise.all([
        societyService.fetchWorldBankSeries(code3, 'SP.POP.TOTL', 20),
        societyService.fetchWorldBankSeries(code3, 'SP.POP.GROW', 20),
        societyService.fetchWorldBankSeries(code3, 'SP.DYN.CBRT.IN', 20),
        societyService.fetchWorldBankSeries(code3, 'SP.DYN.CDRT.IN', 20)
      ]);
      setSeries({ populationSeries, populationGrowthSeries, birthSeries, deathSeries });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load society indicators';
      setError(message);
      setData(null);
      setSeries(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (iso3 && enabled) fetchData(iso3);
  }, [iso3, fetchData, enabled]);

  // Function to fetch individual indicator series on demand
  const fetchIndicatorSeries = useCallback(async (
    indicatorCode: string,
    limitYears: number = 30
  ): Promise<Array<{ year: number; value: number | null }>> => {
    if (!iso3) return [];
    try {
      return await societyService.fetchWorldBankSeries(iso3, indicatorCode, limitYears);
    } catch (err) {
      console.error(`Error fetching indicator series ${indicatorCode}:`, err);
      return [];
    }
  }, [iso3]);

  useEffect(() => {
    if (iso3 && enabled) {
      fetchData(iso3);
    } else if (!enabled) {
      // Don't clear data when disabled, just don't fetch
      setIsLoading(false);
    } else {
      setData(null);
      setError(null);
      setIsLoading(false);
    }
  }, [iso3, enabled, fetchData]);

  return { data, isLoading, error, refetch, series, fetchIndicatorSeries };
}


