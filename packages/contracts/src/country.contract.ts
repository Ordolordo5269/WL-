import { z } from "zod";

// --- Schemas ---

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const countryOverviewSchema = z.object({
  iso3: z.string().length(3),
  name: z.string(),
  region: z.string(),
  population: z.number().optional(),
  gdp: z.number().optional(),
  hdi: z.number().optional(),
  conflictCount: z.int().min(0),
  riskLevel: riskLevelSchema,
});

export const countryIndicatorSchema = z.object({
  indicatorCode: z.string(),
  name: z.string(),
  value: z.number(),
  year: z.int(),
  source: z.string(),
});

// --- Types ---

export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type CountryOverview = z.infer<typeof countryOverviewSchema>;
export type CountryIndicator = z.infer<typeof countryIndicatorSchema>;
