import { z } from 'zod';

export const predictionParamsSchema = {
  params: z.object({
    slug: z.string().min(1),
    iso3: z.string().length(3, 'ISO3 must be exactly 3 characters'),
  }),
  query: z.object({
    years: z.string().transform(Number).pipe(z.number().int().min(1).max(10)).optional(),
  }),
};

export const insightsBodySchema = {
  body: z.object({
    iso3: z.string().length(3, 'ISO3 must be exactly 3 characters'),
    slug: z.string().min(1),
    countryName: z.string().min(1),
    indicatorName: z.string().min(1),
  }),
};
