import { z } from 'zod';

export const pageSizeSchema = {
  query: z.object({
    pageSize: z.string().transform(Number).pipe(z.number().int().min(1).max(50)).optional(),
  }),
};

export const countryNewsParamsSchema = {
  params: z.object({
    country: z.string().min(1),
  }),
};

export const conflictNewsQuerySchema = {
  query: z.object({
    country: z.string().min(1, 'country query parameter is required'),
    type: z.string().optional(),
    pageSize: z.string().transform(Number).pipe(z.number().int().min(1).max(30)).optional(),
  }),
};

export const acledEventsQuerySchema = {
  query: z.object({
    country: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    eventType: z.string().optional(),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(500)).optional(),
    page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  }),
};

export const acledConflictParamsSchema = {
  params: z.object({
    countryIso: z.string().length(2, 'Must be a 2-letter ISO code'),
  }),
};
