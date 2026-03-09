import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';
import type { UcdpStats } from './types';

export function useUcdpStats() {
  return useQuery({
    queryKey: ['ucdp-stats'],
    queryFn: async () => {
      const res = await http.get<{ data: UcdpStats }>('/api/ucdp/stats');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
