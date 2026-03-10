import { z } from 'zod';

export const iso3ParamsSchema = z.object({
  iso3: z.string().length(3),
});

export const slugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const slugIso3ParamsSchema = z.object({
  slug: z.string().min(1),
  iso3: z.string().length(3),
});

export const timeSeriesQuerySchema = z.object({
  startYear: z.string().transform(Number).pipe(z.number().int().min(1900).max(2100)).optional(),
  endYear: z.string().transform(Number).pipe(z.number().int().min(1900).max(2100)).optional(),
});

export const batchQuerySchema = z.object({
  slugs: z.string().min(1),
});
