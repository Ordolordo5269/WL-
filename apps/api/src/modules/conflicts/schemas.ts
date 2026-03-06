import { z } from 'zod';

const conflictStatusEnum = z.enum(['WAR', 'WARM', 'IMPROVING', 'RESOLVED', 'FROZEN']);

export const conflictFiltersSchema = z.object({
  region: z.string().optional(),
  status: conflictStatusEnum.optional(),
  country: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const conflictParamsSchema = z.object({
  slug: z.string().min(1),
});
