import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

export interface CountryEntity {
  id: string;
  name: string;
  iso3: string | null;
}

export function useCountryEntities() {
  return useQuery({
    queryKey: ['countries', 'entities'],
    queryFn: () =>
      http.get<{ data: CountryEntity[] }>('/api/countries/entities').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}
