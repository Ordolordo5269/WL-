import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

interface DashboardSummary {
  totalConflicts: number;
  activeConflicts: number;
  countriesAffected: number;
  avgSeverity: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => http.get<{ data: DashboardSummary }>('/api/dashboard/summary').then(r => r.data),
  });
}
