import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

export type CommodityCategory = 'Energy' | 'Metals' | 'Precious' | 'Agriculture';

export interface CommodityPrice {
  code: string;
  name: string;
  unit: string;
  category: CommodityCategory;
  year: number;
  latestMonth: number | null;
  latestValue: number;
  annualAverage: number;
  annualAveragePrev: number | null;
  trendPctYoY: number | null;
}

export interface CommodityPricesResponse {
  commodities: CommodityPrice[];
  lastUpdated: string | null; // 'YYYY-MM'
  source: string;
}

export function useGlobalCommodityPrices() {
  return useQuery({
    queryKey: ['dashboard', 'commodity-prices'],
    queryFn: () =>
      http
        .get<{ data: CommodityPricesResponse }>('/api/dashboard/commodity-prices')
        .then((r) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour — Pink Sheet publishes monthly
  });
}
