import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

export interface CountryOverview {
  iso3: string;
  name: string;
  region: string;
  population: number | null;
  gdp: number | null;
  hdi: number | null;
  conflictCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export function useCountryOverview(iso3: string | undefined) {
  return useQuery({
    queryKey: ['country', 'overview', iso3],
    queryFn: () =>
      http.get<{ data: CountryOverview }>(`/api/countries/${iso3}/overview`).then(r => r.data),
    enabled: !!iso3 && iso3.length === 3,
  });
}
