import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import type { UcdpConflict, UcdpConflictFilters } from './types';

interface ConflictsResponse {
  data: UcdpConflict[];
  count: number;
}

export function useUcdpConflicts(filters: UcdpConflictFilters = {}) {
  return useQuery({
    queryKey: ['ucdp-conflicts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.location) params.set('location', filters.location);
      if (filters.intensityLevel) params.set('intensityLevel', String(filters.intensityLevel));
      if (filters.typeOfConflict) params.set('typeOfConflict', String(filters.typeOfConflict));
      if (filters.region) params.set('region', String(filters.region));

      const qs = params.toString();
      const res = await http.get<ConflictsResponse>(`/api/ucdp/conflicts${qs ? `?${qs}` : ''}`);
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });
}
