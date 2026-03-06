import { z } from 'zod';

export const iso3ParamsSchema = z.object({
  iso3: z.string().length(3).transform((v) => v.toUpperCase()),
});
