import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import type { ConflictV2, ConflictFiltersParams } from './types';

interface ApiResponse {
  data: ConflictV2[];
  count: number;
}

export interface ConflictsResult {
  conflicts: ConflictV2[];
  count: number;
}

export function useConflicts(filters: ConflictFiltersParams = {}) {
  return useQuery({
    queryKey: ['conflicts', filters],
    queryFn: async (): Promise<ConflictsResult> => {
      const params = new URLSearchParams();
      if (filters.region) params.set('region', filters.region);
      if (filters.status) params.set('status', filters.status);
      if (filters.country) params.set('country', filters.country);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const qs = params.toString();
      const res = await http.get<ApiResponse>(`/api/conflicts/v2${qs ? `?${qs}` : ''}`);
      return { conflicts: res.data, count: res.count };
    },
  });
}
