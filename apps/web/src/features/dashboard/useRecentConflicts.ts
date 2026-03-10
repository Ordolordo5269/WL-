import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

export interface ConflictSummary {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  status: 'WAR' | 'WARM' | 'IMPROVING' | 'RESOLVED' | 'FROZEN';
  conflictType: string;
  startDate: string;
  coordinates: { lat: number; lng: number };
  involvedISO: string[];
  casualties: Array<{ total: number }>;
  factions: Array<{ name: string }>;
  _count?: { events: number };
}

export function useRecentConflicts() {
  return useQuery({
    queryKey: ['conflicts', 'recent'],
    queryFn: () =>
      http.get<{ data: ConflictSummary[]; count: number }>('/api/conflicts').then(r => r.data),
  });
}
