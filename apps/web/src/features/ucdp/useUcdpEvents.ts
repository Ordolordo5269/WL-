import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import type { UcdpEventFilters } from './types';

export function useUcdpEvents(filters: UcdpEventFilters = {}) {
  return useQuery({
    queryKey: ['ucdp-events-geojson', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.country) params.set('country', filters.country);
      if (filters.region) params.set('region', filters.region);
      if (filters.typeOfViolence) params.set('typeOfViolence', String(filters.typeOfViolence));
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.limit) params.set('limit', String(filters.limit));

      const qs = params.toString();
      const res = await http.get<{ data: GeoJSON.FeatureCollection }>(`/api/ucdp/geojson${qs ? `?${qs}` : ''}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
