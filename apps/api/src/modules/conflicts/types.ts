import { z } from 'zod';
import type { conflictFiltersSchema, conflictParamsSchema } from './schemas.js';

export type ConflictFilters = z.infer<typeof conflictFiltersSchema>;
export type ConflictParams = z.infer<typeof conflictParamsSchema>;
