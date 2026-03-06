import { z } from 'zod';

export const insightRequestSchema = z.object({
  entityType: z.enum(['conflict', 'country']),
  entityId: z.string().uuid(),
  question: z.string().optional(),
});
