import { z } from "zod";

// --- Schemas ---

export const conflictEventSchema = z.object({
  date: z.string(),
  description: z.string(),
  source: z.string(),
});

export const conflictSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  region: z.string(),
  country: z.string().length(3),
  severity: z.int().min(1).max(5),
  startDate: z.string(),
  endDate: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  casualties: z.int().min(0),
});

export const conflictDetailSchema = conflictSummarySchema.extend({
  timeline: z.array(conflictEventSchema),
});

export const conflictFiltersSchema = z.object({
  region: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  severity: z.int().min(1).max(5).optional(),
});

// --- Types ---

export type ConflictEvent = z.infer<typeof conflictEventSchema>;
export type ConflictSummary = z.infer<typeof conflictSummarySchema>;
export type ConflictDetail = z.infer<typeof conflictDetailSchema>;
export type ConflictFilters = z.infer<typeof conflictFiltersSchema>;
