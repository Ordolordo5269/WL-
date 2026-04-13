import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

export interface FpiEntry {
  year: number;
  annualAverage: number;
  trendPct: number | null;
  latestMonth: number | null;
  latestValue: number | null;
}

export interface FoodPriceIndex {
  composite: FpiEntry | null;
  cereals: FpiEntry | null;
  dairy: FpiEntry | null;
  meat: FpiEntry | null;
  oils: FpiEntry | null;
  sugar: FpiEntry | null;
  baseNote: string;
}

interface GlobalIndicators {
  foodPriceIndex: FoodPriceIndex | null;
}

export function useGlobalIndicators() {
  return useQuery({
    queryKey: ['dashboard', 'global-indicators'],
    queryFn: () => http.get<{ data: GlobalIndicators }>('/api/dashboard/global-indicators').then((r) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour — FAO updates monthly anyway
  });
}
