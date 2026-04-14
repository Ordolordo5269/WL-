import { useQuery } from '@tanstack/react-query';
import { http } from '../../lib/http';

export type FinCategory = 'FX' | 'Rates' | 'Vol' | 'Equity' | 'Crypto';

export interface FinEntry {
  code: string;
  name: string;
  unit: string;
  category: FinCategory;
  year: number;
  latestMonth: number | null;
  latestValue: number;
  annualAverage: number;
  annualAveragePrev: number | null;
  trendPctYoY: number | null;
}

export interface PredictionMarket {
  code: string;
  slug: string | null;
  category: string;
  question: string;
  probabilityYes: number | null;
  probabilityNo: number | null;
  volume: number | null;
  liquidity: number | null;
  closeDate: string | null;
  sourceUrl: string | null;
}

export interface FinancialPulse {
  fx: FinEntry[];
  rates: FinEntry[];
  vol: FinEntry[];
  equities: FinEntry[];
  crypto: FinEntry[];
  prediction: PredictionMarket[];
  lastUpdated: string | null;
}

export function useFinancialPulse() {
  return useQuery({
    queryKey: ['dashboard', 'financial-pulse'],
    queryFn: () =>
      http.get<{ data: FinancialPulse }>('/api/dashboard/financial-pulse').then((r) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour — financial data ingested monthly
  });
}
