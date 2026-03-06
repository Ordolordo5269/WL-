import { z } from 'zod';
import type { iso3ParamsSchema } from './schemas.js';

export type Iso3Params = z.infer<typeof iso3ParamsSchema>;

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CountryOverview {
  iso3: string;
  name: string;
  region: string;
  population: number | null;
  gdp: number | null;
  hdi: number | null;
  conflictCount: number;
  riskLevel: RiskLevel;
}
