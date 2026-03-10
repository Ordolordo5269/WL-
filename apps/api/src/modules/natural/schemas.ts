import { z } from 'zod';

export const naturalLayerParamsSchema = {
  params: z.object({
    type: z.enum(['rivers', 'peaks', 'mountain-ranges']),
  }),
};

export const naturalSearchSchema = {
  query: z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters').max(200),
  }),
};
